const {
  Transaction,
  ComputeBudgetProgram,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const { BET_RECEIVER_WALLET } = require("../../config/credentials");
const { RAFFLE_REWARD_TYPES } = require("../../config/data");
const { SplTokenSendTransaction, RaffleReward } = require("../../models");
const { getFeeData } = require("../../helpers/cache/system-fee");
const { addNftSendTransaction } = require("../../helpers/solana/send-nft");
const {
  TOKEN_2022_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedWithFeeInstruction,
  TokenAccountNotFoundError,
  getAccount,
} = require("@solana/spl-token");
const { getTokenDetail } = require("../../helpers/solana/token-program");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const {
  generateChecksum,
} = require("../../helpers/solana/checksum-validation");
const { publicKey } = require("@metaplex-foundation/umi");
const { getConnection } = require("../../config/solana");

const connection = getConnection();

const getRaffleRefundTransaction = async (raffle, raffleCreatorPubkey) => {
  const feeData = await getFeeData();
  //find all raffle rewards
  const raffleRewards = await RaffleReward.findAll({
    where: {
      raffleId: raffle.id,
    },
    attributes: ["id", "raffleId", "rewardType", "mintAddress", "amount"],
    raw: true,
  });
  if (raffleRewards.length < 1) {
    return {
      success: false,
      message: "No raffle rewards found.",
      data: null,
    };
  }
  const fromAccount = BET_RECEIVER_WALLET;
  const toAccount = raffleCreatorPubkey;

  //NFT refund
  let transaction = new Transaction();

  // Set compute budget for optimal performance
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 300_000,
    })
  );

  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 300_000,
    })
  );

  //transaction fee
  const transactionFee = Number(feeData.transaction_fee) || DEFAULT_COMMISSION;
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(toAccount),
      toPubkey: new PublicKey(BET_RECEIVER_WALLET),
      lamports: BigInt(transactionFee * LAMPORTS_PER_SOL),
    })
  );
  // NFT refund — handles both single and multiple NFT rewards in one batched transaction
  const allAreNFTs = raffleRewards.every(
    (r) => r.rewardType === RAFFLE_REWARD_TYPES.NFT
  );
  if (allAreNFTs) {
    const mintAddresses = raffleRewards.map((r) => ({
      address: r.mintAddress,
      nftType: "auto",
    }));

    const nftTxResult = await addNftSendTransaction({
      transaction,
      mintAddresses,
      toAccountAddress: toAccount,
      fromAccountAddress: fromAccount,
      direction: "platform_to_user",
    });

    return {
      success: true,
      message: "NFT refund",
      data: {
        ...nftTxResult,
        transactionDetails: raffleRewards.map((r) => ({
          tokenAddress: r.mintAddress,
          uiAmount: 1,
          raffleTitle: raffle.title,
          decimal: 0,
          type: RAFFLE_REWARD_TYPES.NFT,
        })),
      },
    };
  }

  //token refunds

  let tokenTransactionDetails = [];
  for (const tokenReward of raffleRewards) {
    let tokenDetail;
    const tokenAddress = tokenReward.mintAddress;
    try {
      tokenDetail = await getTokenDetail(tokenAddress);
    } catch (tokenError) {
      // If token lookup fails, fall back to NFT transfer (covers Core NFTs saved as SPL tokens)
      const nftResult = await addNftSendTransaction({
        transaction,
        mintAddresses: [
          {
            address: tokenAddress,
            authorityAddress: fromAccount,
            nftType: "auto",
          },
        ],
        toAccountAddress: toAccount,
        fromAccountAddress: fromAccount,
        direction: "platform_to_user",
      });

      return {
        success: true,
        message: "NFT refund",
        data: {
          ...nftResult,
          transactionDetails: [
            {
              tokenAddress,
              uiAmount: 1,
              raffleTitle: raffle.title,
              decimal: 9,
              type: RAFFLE_REWARD_TYPES.NFT,
            },
          ],
        },
      };
    }

    if (!tokenDetail) {
      // getTokenDetail returned null — mint is likely an NFT stored with wrong rewardType.
      // Fall back to NFT transfer to avoid crashing the refund flow.
      logger.warn(
        `getTokenDetail returned null for ${tokenAddress} in refund — falling back to NFT transfer`
      );
      const nftResult = await addNftSendTransaction({
        transaction,
        mintAddresses: [{ address: tokenAddress, nftType: "auto" }],
        toAccountAddress: toAccount,
        fromAccountAddress: fromAccount,
        direction: "platform_to_user",
      });
      return {
        success: true,
        message: "NFT refund",
        data: {
          ...nftResult,
          transactionDetails: [
            {
              tokenAddress,
              uiAmount: 1,
              raffleTitle: raffle.title,
              decimal: 0,
              type: RAFFLE_REWARD_TYPES.NFT,
            },
          ],
        },
      };
    }

    const { transferFeeConfig, decimals, tokenProgramId } = tokenDetail;

    const uiAmount = tokenReward.amount * Math.pow(10, decimals);

    // Get token accounts
    const fromAta = getAssociatedTokenAddressSync(
      new PublicKey(tokenAddress),
      new PublicKey(fromAccount),
      false,
      tokenProgramId
    );

    const toAta = getAssociatedTokenAddressSync(
      new PublicKey(tokenAddress),
      new PublicKey(toAccount),
      false,
      tokenProgramId
    );

    // Check if destination account exists, create if needed
    try {
      await getAccount(connection, toAta, "confirmed", tokenProgramId);
    } catch (e) {
      if (e instanceof TokenAccountNotFoundError) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(toAccount), // User pays for account creation
            toAta,
            new PublicKey(toAccount),
            new PublicKey(tokenAddress),
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }
    }

    // Handle Token-2022 transfer fees
    if (tokenProgramId === TOKEN_2022_PROGRAM_ID && transferFeeConfig) {
      const feeBasisPoints =
        transferFeeConfig?.newerTransferFee?.transferFeeBasisPoints || 0;
      const maxFee = BigInt(
        transferFeeConfig?.newerTransferFee?.maximumFee || 0
      );
      const fee = (BigInt(uiAmount) * BigInt(feeBasisPoints)) / BigInt(10_000);
      const actualFee = fee > maxFee ? maxFee : fee;

      transaction.add(
        createTransferCheckedWithFeeInstruction(
          fromAta,
          new PublicKey(tokenAddress),
          toAta,
          new PublicKey(fromAccount),
          BigInt(uiAmount),
          decimals,
          actualFee,
          [],
          tokenProgramId
        )
      );
    } else {
      transaction.add(
        createTransferInstruction(
          fromAta,
          toAta,
          new PublicKey(fromAccount),
          uiAmount,
          [],
          tokenProgramId
        )
      );
    }

    tokenTransactionDetails.push({
      tokenAddress: tokenReward.mintAddress,
      uiAmount,
      raffleTitle: raffle.title,
      decimal: decimals,
      type: tokenReward.rewardType,
    });
  }

  // Convert to UMI transaction to generate checksum
  const umi = createUmi(connection);
  const latestBlockhash = await umi.rpc.getLatestBlockhash();
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.feePayer = new PublicKey(toAccount);
  const umiTx = umi.transactions.create({
    version: "legacy",
    blockhash: latestBlockhash.blockhash,
    instructions: transaction.instructions,
    payer: publicKey(toAccount),
  });

  const checksum = generateChecksum(umiTx.message);

  // Serialize the original transaction (unsigned)
  const serializedTx = transaction
    .serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })
    .toString("base64");

  return {
    success: true,
    message: "Creator Asset Refund",
    data: {
      serializedTx: serializedTx,
      blockhash: latestBlockhash.blockhash,
      checksum,
      type: "",
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      transactionDetails: tokenTransactionDetails,
    },
  };
};

module.exports = { getRaffleRefundTransaction };
