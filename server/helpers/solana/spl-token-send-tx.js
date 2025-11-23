const { Transaction, SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } = require("@solana/web3.js");
const {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  TokenAccountNotFoundError,
  createTransferInstruction,
  createTransferCheckedWithFeeInstruction,
  TOKEN_2022_PROGRAM_ID,
} = require("@solana/spl-token");
const { PublicKey } = require("@metaplex-foundation/js");
const { getConnectionDas, getUmi } = require("../../config/solana");
const { getTokenDetail } = require("./token-program");
const logger = require("../../util/logger");
const connection = getConnectionDas();
const { Wallet } = require("./wallet.js");
const { addCommissionToTransaction } = require("../../services/commissions.js");
const { SOLANA_TOKEN_ADDRESS } = require("../../config/constants.js");
const { addNftSendTransaction } = require("./send-nft.js");
const { PLATFORM_WALLET } = require("../../config/credentials.js");
const { USER_REWARD_TYPE } = require("../../config/data.js");
const { signerIdentity, createNoopSigner, transactionBuilder, publicKey } = require("@metaplex-foundation/umi");
const { base64 } = require("@metaplex-foundation/umi/serializers");
const { generateChecksum } = require("./checksum-validation.js");

const umi = getUmi();

//splTokenSendSummary = [ {tokenAddress, amount, toAccount}]
const sendMultipleSplTokenTx = async ({ splTokenSendSummary, solCommission, feePayer }) => {
  // umi.use(signerIdentity(createNoopSigner(publicKey(PLATFORM_WALLET))));
  try {
    let transaction = new Transaction();
    // let transaction = transactionBuilder().setBlockhash(latestBlockhash.blockhash).setFeePayer(umi);

    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 300_000,
      }),
    );

    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 300_000,
      }),
    );

    for (const txDetail of splTokenSendSummary) {
      const { tokenAddress, toAccount, amount, type } = txDetail;

      switch (type) {
        case USER_REWARD_TYPE.SOLANA:
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: new PublicKey(Wallet.getWalletPubkey()),
              toPubkey: new PublicKey(toAccount),
              lamports: amount * LAMPORTS_PER_SOL,
            }),
          );
          break;
        case USER_REWARD_TYPE.NFT:
          let serializedTx = await addNftSendTransaction({
            transaction,
            mintAddresses: [
              {
                address: tokenAddress,
                authorityAddress: PLATFORM_WALLET,
                nftType: "nft", // <-- You can use "pnft" here to treat differently
              },
            ],
            toAccountAddress: toAccount,
            fromAccountAddress: PLATFORM_WALLET,
          });

          return {
            success: true,
            data: serializedTx,
            message: "Created Serialized Transaction.",
          };
          break;
        default:
          const tokenDetail = await getTokenDetail(tokenAddress);
          const { transferFeeConfig, decimals, tokenProgramId } = tokenDetail;

          const uiAmount = amount * Math.pow(10, decimals);

          const fromAta = getAssociatedTokenAddressSync(
            new PublicKey(tokenAddress),
            new PublicKey(Wallet.getWalletPubkey()),
            false,
            tokenProgramId,
          ); // 👈 pass in the Token-2022 program ID

          const toAta = getAssociatedTokenAddressSync(
            new PublicKey(tokenAddress),
            new PublicKey(toAccount),
            false,
            tokenProgramId,
          ); // 👈 pass in the Token-2022 program ID

          const createAccountInstruction = createAssociatedTokenAccountInstruction(
            new PublicKey(toAccount),
            toAta,
            new PublicKey(toAccount),
            new PublicKey(tokenAddress),
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          );

          try {
            await getAccount(connection, toAta, "confirmed", tokenProgramId);
          } catch (e) {
            // If the account does not exist, add the create account instruction to the transaction
            if (e instanceof TokenAccountNotFoundError) {
              transaction.add(createAccountInstruction);
            }
          }
          let actualFee = 0;

          if (tokenProgramId === TOKEN_2022_PROGRAM_ID) {
            // Fee basis points for transfers (100 = 1%)
            const feeBasisPoints = transferFeeConfig?.newerTransferFee.transferFeeBasisPoints || 0;

            const maxFee = BigInt(transferFeeConfig?.newerTransferFee.maximumFee || 0);

            const fee = (BigInt(uiAmount) * BigInt(feeBasisPoints)) / BigInt(10_000);

            actualFee = fee > maxFee ? maxFee : fee;

            transaction.add(
              createTransferCheckedWithFeeInstruction(
                fromAta,
                new PublicKey(tokenAddress),
                toAta,
                new PublicKey(Wallet.getWalletPubkey()),
                BigInt(uiAmount),
                decimals,
                actualFee,
                [],
                tokenProgramId,
              ),
            );
          }

          if (tokenProgramId === TOKEN_PROGRAM_ID) {
            transaction.add(
              createTransferInstruction(
                fromAta,
                toAta,
                new PublicKey(Wallet.getWalletPubkey()),
                uiAmount,
                [],
                tokenProgramId,
              ),
            );
          }
          break;
      }
    }

    if (solCommission > 0) {
      transaction = await addCommissionToTransaction({ transaction, senderPubkey: feePayer });
    }

    // const frontendNoopSigner = createNoopSigner(publicKey(feePayer));
    // const backendNoopSigner = createNoopSigner(Wallet.getWalletPubkey());

    let tx = umi.transactions.create({
      version: "legacy",
      blockhash: (await umi.rpc.getLatestBlockhash()).blockhash,
      instructions: transaction.instructions,
      payer: feePayer,
    });

    const serializedTx = umi.transactions.serialize(tx);
    const txBase64 = base64.deserialize(serializedTx)[0];

    return {
      success: true,
      data: { serializedTx: txBase64, checksum: generateChecksum(tx.message) },
      message: "Created Serialized Transaction.",
    };
  } catch (error) {
    logger.error("Error on sendMultipleSplTokenTx", error);
    return {
      success: false,
      data: null,
      message:
        error?.message ||
        "We encountered an unexpected issue while sending the multiple tokens. Please try again later.",
    };
  }
};

module.exports = {
  sendMultipleSplTokenTx,
};
