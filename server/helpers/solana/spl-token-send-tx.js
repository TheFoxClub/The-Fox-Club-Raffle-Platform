const {
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  PublicKey,
} = require("@solana/web3.js");
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
const { getConnectionDas, getUmi } = require("../../config/solana");
const { getTokenDetail } = require("./token-program");
const connection = getConnectionDas();
const { Wallet } = require("./wallet.js");
const { addCommissionToTransaction } = require("../../services/commissions.js");
const { SOLANA_TOKEN_ADDRESS } = require("../../config/constants.js");
const { addNftSendTransaction } = require("./send-nft.js");
const { RAFFLE_REWARD_TYPES, TOKEN_TYPE } = require("../../config/data.js");
const {
  signerIdentity,
  createNoopSigner,
  publicKey,
} = require("@metaplex-foundation/umi");
const { base64 } = require("@metaplex-foundation/umi/serializers");
const { generateChecksum } = require("./checksum-validation.js");
const logger = require("../../util/logger");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { BET_RECEIVER_WALLET } = require("../../config/credentials.js");
const { getFeeData } = require("../cache/system-fee.js");

const umi = getUmi();

/**
 * Send multiple SPL tokens, NFTs, or SOL with bidirectional support
 * @param {Object} params
 * @param {Array} params.splTokenSendSummary - Array of token transfer details
 * @param {number} params.solCommission - SOL commission amount
 * @param {string} params.feePayer - Wallet address paying for the transaction fees
 * @param {number} params.transactionFee - Transaction Fee
 * @param {string} params.fromAccount - Source wallet address (can be user or platform)
 * @param {boolean} params.isUserToPlatform - Direction flag: true = user→platform, false = platform→user
 */
const sendMultipleSplTokenTx = async ({
  splTokenSendSummary,
  solCommission,
  feePayer,
  transactionFee,
  fromAccount,
  isUserToPlatform = true,
}) => {
  try {
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
    if (isUserToPlatform) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(feePayer),
          toPubkey: new PublicKey(BET_RECEIVER_WALLET),
          lamports: BigInt(transactionFee * value),
        })
      );
    }

    let signatures = [];
    let transactionDetails = [];

    for (const txDetail of splTokenSendSummary) {
      const { tokenAddress, toAccount, amount, type, metadata = {} } = txDetail;

      switch (type) {
        case RAFFLE_REWARD_TYPES.SOLANA:
          // SOL transfer
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: new PublicKey(fromAccount),
              toPubkey: new PublicKey(toAccount),
              lamports: amount * LAMPORTS_PER_SOL,
            })
          );

          transactionDetails.push({
            type: "SOL",
            from: fromAccount,
            to: toAccount,
            amount,
            direction: isUserToPlatform
              ? "user_to_platform"
              : "platform_to_user",
          });
          break;

        case RAFFLE_REWARD_TYPES.NFT:
          // NFT transfers cannot be combined with other transfers in the same transaction
          // If there are multiple rewards including NFTs, we need to handle them separately
          if (splTokenSendSummary.length > 1) {
            throw new Error(
              "Mixed reward types (NFT + SPL tokens) are not currently supported in a single raffle. Please use either NFTs only or SPL tokens only."
            );
          }

          // Single NFT transfer
          try {
            const serializedTx = await addNftSendTransaction({
              transaction,
              mintAddresses: [
                {
                  address: tokenAddress,
                  nftType: "auto", // Auto-detect NFT type
                },
              ],
              toAccountAddress: toAccount,
              fromAccountAddress: fromAccount,
              direction: isUserToPlatform
                ? "user_to_platform"
                : "platform_to_user",
            });

            if (serializedTx && serializedTx.serializedTx) {
              // For NFT transfers, we return immediately with the serialized transaction
              // The frontend needs to sign and submit this
              return {
                success: true,
                data: serializedTx,
                message: "Created NFT transfer transaction",
                metadata: {
                  type: "NFT",
                  mint: tokenAddress,
                  direction: isUserToPlatform
                    ? "user_to_platform"
                    : "platform_to_user",
                },
              };
            }

            transactionDetails.push({
              type: "NFT",
              mint: tokenAddress,
              from: fromAccount,
              to: toAccount,
              direction: isUserToPlatform
                ? "user_to_platform"
                : "platform_to_user",
            });
          } catch (nftError) {
            // logger.error(`NFT transfer failed for ${tokenAddress}:`, nftError);
            throw new Error(`NFT transfer failed: ${nftError.message}`);
          }
          break;

        default:
          // SPL Token transfer (both regular and Token-2022)
          try {
            const tokenDetail = await getTokenDetail(tokenAddress);
            const { transferFeeConfig, decimals, tokenProgramId } = tokenDetail;

            const uiAmount = amount * Math.pow(10, decimals);

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
                // Create associated token account for recipient
                transaction.add(
                  createAssociatedTokenAccountInstruction(
                    new PublicKey(fromAccount), // Payer
                    toAta,
                    new PublicKey(toAccount), // Owner
                    new PublicKey(tokenAddress),
                    tokenProgramId,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                  )
                );
              } else {
                throw e;
              }
            }

            // Handle Token-2022 transfer fees
            let actualFee = 0;
            if (tokenProgramId === TOKEN_2022_PROGRAM_ID && transferFeeConfig) {
              const feeBasisPoints =
                transferFeeConfig?.newerTransferFee?.transferFeeBasisPoints ||
                0;
              const maxFee = BigInt(
                transferFeeConfig?.newerTransferFee?.maximumFee || 0
              );
              const fee =
                (BigInt(uiAmount) * BigInt(feeBasisPoints)) / BigInt(10_000);
              actualFee = fee > maxFee ? maxFee : fee;

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
              // Regular SPL token transfer
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

            transactionDetails.push({
              type:
                tokenProgramId === TOKEN_2022_PROGRAM_ID
                  ? "SPL_TOKEN_2022"
                  : "SPL_TOKEN",
              mint: tokenAddress,
              from: fromAccount,
              to: toAccount,
              amount: uiAmount,
              decimals,
              fee: actualFee,
              direction: isUserToPlatform
                ? "user_to_platform"
                : "platform_to_user",
            });
          } catch (tokenError) {
            throw new Error(
              `Token transfer failed for ${tokenAddress}: ${tokenError.message}`
            );
          }
          break;
      }
    }

    // Add commission if applicable (only for user→platform transfers)
    if (solCommission > 0 && isUserToPlatform) {
      try {
        transaction = await addCommissionToTransaction({
          transaction,
          senderPubkey: feePayer,
          commissionAmount: solCommission,
        });

        transactionDetails.push({
          type: "COMMISSION",
          amount: solCommission,
          payer: feePayer,
          direction: "commission",
        });
      } catch (commissionError) {
        // logger.error("Failed to add commission:", commissionError);
        // Don't fail the whole transaction if commission fails
      }
    }

    // Prepare transaction for signing
    const latestBlockhash = await umi.rpc.getLatestBlockhash();

    let tx = umi.transactions.create({
      version: "legacy",
      blockhash: latestBlockhash.blockhash,
      instructions: transaction.instructions,
      payer: new PublicKey(feePayer),
    });

    const serializedTx = umi.transactions.serialize(tx);
    const txBase64 = base64.deserialize(serializedTx)[0];

    // Generate checksum for transaction verification
    const checksum = generateChecksum(tx.message);

    // logger.info(
    //   `Created transaction with ${transaction.instructions.length} instructions`
    // );

    return {
      success: true,
      data: {
        serializedTx: txBase64,
        checksum,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        transactionDetails,
        direction: isUserToPlatform ? "user_to_platform" : "platform_to_user",
      },
      message: "Created Serialized Transaction.",
    };
  } catch (error) {
    // logger.error("Error in sendMultipleSplTokenTx:", error);
    return {
      success: false,
      data: null,
      message:
        error?.message || "Failed to create transaction. Please try again.",
      error: error.stack,
    };
  }
};

/**
 * Helper function to send a single reward (for claiming)
 */
const sendSingleRewardTx = async ({
  reward,
  toAccount,
  fromAccount,
  feePayer,
  direction,
}) => {
  return await sendMultipleSplTokenTx({
    splTokenSendSummary: [
      {
        tokenAddress: reward.mintAddress,
        toAccount,
        amount: reward.amount || 1,
        type: reward.rewardType || RAFFLE_REWARD_TYPES.SPL_TOKEN,
        metadata: {
          rewardId: reward.id,
          rewardName: reward.rewardName,
        },
      },
    ],
    solCommission: 0,
    feePayer,
    fromAccount,
    isUserToPlatform: direction === "user_to_platform",
  });
};

/**
 * Create a claim transaction that's pre-signed by platform wallet
 * User only needs to sign for fee payment
 */
const createClaimTransaction = async ({
  reward,
  toAccount,
  fromAccount,
  feePayer,
}) => {
  try {
    const { generateChecksum } = require("./checksum-validation.js");

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
    const feeData = await getFeeData();
    const transactionFee =
      Number(feeData.transaction_fee) || DEFAULT_COMMISSION;
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(feePayer),
        toPubkey: new PublicKey(BET_RECEIVER_WALLET),
        lamports: BigInt(transactionFee * value),
      })
    );

    const { tokenAddress, amount, type } = reward;

    logger.info(
      `createClaimTransaction - type: ${type} (${typeof type}), NFT enum: ${
        RAFFLE_REWARD_TYPES.NFT
      }, match: ${type === RAFFLE_REWARD_TYPES.NFT}`
    );

    // Ensure type is a number for comparison
    const rewardType =
      typeof type === "string" ? RAFFLE_REWARD_TYPES[type] : type;

    console.log("rewardtype: ", rewardType, type);

    switch (rewardType) {
      case RAFFLE_REWARD_TYPES.SOLANA:
        // SOL transfer
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(fromAccount),
            toPubkey: new PublicKey(toAccount),
            lamports: amount * LAMPORTS_PER_SOL,
          })
        );
        break;

      case RAFFLE_REWARD_TYPES.NFT:
        // For NFT transfers, we'll use the existing NFT transfer function
        // which handles the complexity of NFT transfers
        const nftResult = await addNftSendTransaction({
          transaction: new Transaction(),
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
          data: {
            serializedTx: nftResult.serializedTx,
            blockhash: nftResult.blockhash,
            lastValidBlockHeight: nftResult.lastValidBlockHeight,
            checksum: nftResult.checksum,
            autoSubmit: nftResult.autoSubmit || false, // Pass through autoSubmit flag
          },
          message: "Created NFT claim transaction",
        };

      default:
        // SPL Token transfer
        let tokenDetail;
        try {
          tokenDetail = await getTokenDetail(tokenAddress);
        } catch (tokenError) {
          // If token lookup fails, fall back to NFT transfer (covers Core NFTs saved as SPL tokens)
          const nftResult = await addNftSendTransaction({
            transaction: new Transaction(),
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
            data: {
              serializedTx: nftResult.serializedTx,
              blockhash: nftResult.blockhash,
              lastValidBlockHeight: nftResult.lastValidBlockHeight,
              autoSubmit: nftResult.autoSubmit || false,
            },
            message: "Created NFT claim transaction",
          };
        }

        if (!tokenDetail) {
          throw new Error(
            `Failed to get token details for ${tokenAddress}. This might be an NFT - please check the reward type.`
          );
        }

        const { transferFeeConfig, decimals, tokenProgramId } = tokenDetail;

        const uiAmount = amount * Math.pow(10, decimals);

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
                new PublicKey(feePayer), // User pays for account creation
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
          const fee =
            (BigInt(uiAmount) * BigInt(feeBasisPoints)) / BigInt(10_000);
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
        break;
    }

    // Get latest blockhash
    const latestBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = new PublicKey(feePayer);

    // Convert to UMI transaction to generate checksum
    const umi = createUmi(connection);

    const umiTx = umi.transactions.create({
      version: "legacy",
      blockhash: latestBlockhash.blockhash,
      instructions: transaction.instructions,
      payer: publicKey(feePayer),
    });

    const checksum = generateChecksum(umiTx.message);

    // Serialize the original transaction (unsigned)
    const serializedTx = transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString("base64");

    logger.info("Created UNSIGNED claim transaction for user to sign first");

    return {
      success: true,
      data: {
        serializedTx,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        checksum,
      },
      message: "Created unsigned claim transaction",
    };
  } catch (error) {
    logger.error("Error in createClaimTransaction:", error);
    return {
      success: false,
      data: null,
      message: error?.message || "Failed to create claim transaction",
      error: error.stack,
    };
  }
};

/**
 * Create a payout transaction that's pre-signed by platform wallet
 * User only needs to sign for fee payment
 */
const createPayoutTransaction = async ({
  amount,
  toAccount,
  fromAccount,
  feePayer,
  tokenType = 0, // Default to SOLANA (0)
  tokenAddress = null, // Token address for SPL tokens
}) => {
  try {
    const { Wallet } = require("./wallet.js");

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
    const feeData = await getFeeData();
    const transactionFee =
      Number(feeData.transaction_fee) || DEFAULT_COMMISSION;
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(feePayer),
        toPubkey: new PublicKey(BET_RECEIVER_WALLET),
        lamports: BigInt(transactionFee * value),
      })
    );

    if (tokenType === TOKEN_TYPE.SOLANA) {
      // SOL transfer from platform to user
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(fromAccount), // Platform wallet
          toPubkey: new PublicKey(toAccount), // User wallet
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );
    } else {
      // SPL Token transfer
      if (!tokenAddress) {
        throw new Error("Token address is required for SPL token payouts");
      }

      const tokenDetail = await getTokenDetail(tokenAddress);
      const { decimals, tokenProgramId } = tokenDetail;

      const uiAmount = amount * Math.pow(10, decimals);

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

      try {
        await getAccount(connection, toAta, "confirmed", tokenProgramId);
      } catch (e) {
        if (e instanceof TokenAccountNotFoundError) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              new PublicKey(feePayer), // User
              toAta,
              new PublicKey(toAccount), // Owner
              new PublicKey(tokenAddress),
              tokenProgramId,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        } else {
          throw e;
        }
      }

      // Add SPL token transfer instruction
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

    const latestBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = new PublicKey(feePayer); // User pays fees

    // Platform wallet partially signs the transaction
    const signedTransaction = Wallet.partialSign(transaction);

    // Serialize the partially signed transaction
    const serializedTx = signedTransaction
      .serialize({
        requireAllSignatures: false, // Allow partial signatures
        verifySignatures: false,
      })
      .toString("base64");

    return {
      success: true,
      data: {
        serializedTx,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      message: "Created pre-signed payout transaction",
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      message: error?.message || "Failed to create payout transaction",
      error: error.stack,
    };
  }
};

/**
 * Submit a signed transaction to the Solana blockchain
 */
const submitTransactionToBlockchain = async (signedTransactionBase64) => {
  try {
    const transactionBuffer = Buffer.from(signedTransactionBase64, "base64");

    logger.info(`Submitting transaction to blockchain...`);
    logger.info(`Transaction size: ${transactionBuffer.length} bytes`);

    // Submit to Solana network with simulation first
    const signature = await connection.sendRawTransaction(transactionBuffer, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });

    logger.info(`Transaction submitted with signature: ${signature}`);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed"
    );

    if (confirmation.value.err) {
      logger.error(`Transaction confirmation failed:`, confirmation.value.err);
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    logger.info(`Transaction confirmed successfully`);
    return {
      success: true,
      signature,
      confirmation,
    };
  } catch (error) {
    logger.error(`Error submitting transaction to blockchain:`, error);

    // Try to get more detailed logs if available
    if (error.logs) {
      logger.error(`Transaction logs:`, error.logs);
    }

    return {
      success: false,
      message: error.message,
      error: error.message,
      logs: error.logs || [],
    };
  }
};

module.exports = {
  sendMultipleSplTokenTx,
  sendSingleRewardTx,
  createClaimTransaction,
  createPayoutTransaction,
  submitTransactionToBlockchain,
};
