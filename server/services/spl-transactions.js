const { Op } = require("sequelize");
const {
  SplTokenSendTransaction,
  GameReward,
  Raffle,
  UserAirdropReward,
  AirdropDetail,
} = require("../models");
const {
  SPL_TOKEN_SEND_TX_STATUS,
  SPL_TOKEN_SEND_TRANSACTION_TYPE,
  TOKEN_TYPE,
  USER_AIRDROP_REWARD_STATUS,
  AIRDROP_STATUS,
} = require("../config/data");
const { DEFAULT_COMMISSION } = require("../config/constants");
const { LAMPORTS_PER_SOL } = require("@solana/web3.js");
const logger = require("../util/logger");
const SocketService = require("./socket.service");
const { getFeeData } = require("../helpers/cache/system-fee");

const USER_AIRDROP_STATUS = USER_AIRDROP_REWARD_STATUS;

const getSplTokenSendTransactions = async () => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 minutes ago
  const oneMinuteAgo = now - 1 * 60 * 1000; // 1 minute ago
  const thirtySecondsAgo = now - 30 * 1000; // 30 seconds ago

  // Get regular transactions (1-5 minutes old)
  const regularRows = await SplTokenSendTransaction.findAll({
    where: {
      txId: { [Op.not]: null },
      status: SPL_TOKEN_SEND_TX_STATUS.PENDING,
      // createdAt: {
      //   [Op.between]: [new Date(fiveMinutesAgo), new Date(oneMinuteAgo)],
      // },
    },
    // limit: 5,
    order: [["createdAt", "DESC"]],
  });

  // Get recent payout transactions (30 seconds to 5 minutes old) to ensure they're processed
  const payoutRows = await SplTokenSendTransaction.findAll({
    where: {
      txId: { [Op.not]: null },
      status: SPL_TOKEN_SEND_TX_STATUS.PENDING,
      rewardTransferType: "creator_payout",
      createdAt: {
        [Op.between]: [new Date(fiveMinutesAgo), new Date(oneMinuteAgo)],
      },
    },
    // limit: 3,
    order: [["createdAt", "DESC"]],
  });

  // get successful payout transactions that might need claimedAmount updates
  const successfulPayoutTxIds = await SplTokenSendTransaction.findAll({
    where: {
      txId: { [Op.not]: null },
      status: SPL_TOKEN_SEND_TX_STATUS.SUCCESS,
      rewardTransferType: "creator_payout",
      raffleId: { [Op.not]: null },
      createdAt: {
        [Op.gte]: new Date(now - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    attributes: ["id", "raffleId"],
    // limit: 10,
    order: [["createdAt", "DESC"]],
  });

  // Filter to only include transactions where the raffle's claimedAmount is still 0
  const successfulPayoutRows = [];
  for (const txRecord of successfulPayoutTxIds) {
    const raffle = await Raffle.findOne({
      where: {
        id: txRecord.raffleId,
        claimedAmount: 0, // Only get raffles where claimedAmount hasn't been updated
      },
      attributes: ["id"],
    });

    if (raffle) {
      const fullTxRecord = await SplTokenSendTransaction.findOne({
        where: { id: txRecord.id },
      });
      if (fullTxRecord) {
        successfulPayoutRows.push(fullTxRecord);
      }
    }
  }

  // Combine and deduplicate
  const allRows = [...regularRows];
  payoutRows.forEach((payoutRow) => {
    if (!allRows.find((row) => row.id === payoutRow.id)) {
      allRows.push(payoutRow);
    }
  });
  successfulPayoutRows.forEach((successfulRow) => {
    if (!allRows.find((row) => row.id === successfulRow.id)) {
      allRows.push(successfulRow);
    }
  });

  logger.info(
    `Found ${regularRows.length} regular pending transactions, ${payoutRows.length} pending payout transactions, and ${successfulPayoutRows.length} successful payout transactions needing claimedAmount updates`,
  );

  if (allRows.length > 0) {
    allRows.forEach((row) => {
      logger.info(
        `Transaction to process: ${row.txId}, type: ${row.type}, rewardTransferType: ${row.rewardTransferType}, raffleId: ${row.raffleId}, status: ${row.status}, created: ${row.createdAt}`,
      );
    });
  }

  return allRows.map((row) => {
    return { txId: row.txId, txType: row.type };
  });
};

const updateDbAndConfirmTransactions = async (op) => {
  try {
    const successfulTransactionsToUpdate = op.outputData.map(async (tx) => {
      const existingTransaction = await SplTokenSendTransaction.findOne({
        where: { txId: tx.txId },
      });

      if (!existingTransaction) {
        logger.error("Successful transaction doesn't exist in the database");
        return;
      }

      logger.info(
        `Processing transaction ${tx.txId}: type=${existingTransaction.type}, rewardTransferType=${existingTransaction.rewardTransferType}, raffleId=${existingTransaction.raffleId}`,
      );

      if (tx.details.txType === SPL_TOKEN_SEND_TRANSACTION_TYPE.MULTIPLE) {
        existingTransaction.status = SPL_TOKEN_SEND_TX_STATUS.SUCCESS;
        await existingTransaction.save();
        return;
      }

      const feeData = await getFeeData();
      const commissionFee = feeData.transaction_fee || DEFAULT_COMMISSION;
      const commissionInLamports = commissionFee * LAMPORTS_PER_SOL;
      const checks = () => {
        if (tx.details.txType === "solana") {
          return tx.details.amounts.some(
            (amount) =>
              (amount ===
                Number(existingTransaction.commissionAmount) *
                  LAMPORTS_PER_SOL) ===
                amount || // <-- transferring commission and amount to same wallet.
              amount === Number(existingTransaction.uiAmount) ||
              amount ===
                Number(existingTransaction.creatorAmount) * LAMPORTS_PER_SOL, // <-- transferring commission and amount to same wallet.
          );
        }
        return (
          Math.round(Number(existingTransaction.uiAmount)) ===
            Math.round(tx.details.amount) ||
          Math.round(
            Number(existingTransaction.commissionAmount) *
              Math.pow(10, Number(existingTransaction.decimals)),
          ) === Math.round(Number(tx.details.amount)) ||
          Math.round(
            Number(existingTransaction.creatorAmount) *
              Math.pow(10, Number(existingTransaction.decimals)),
          ) === Math.round(Number(tx.details.amount))
        );
      };

      const isValid = checks();
      existingTransaction.status = isValid
        ? SPL_TOKEN_SEND_TX_STATUS.SUCCESS
        : SPL_TOKEN_SEND_TX_STATUS.MISMATCHED;

      await existingTransaction.save();

      // Keep user airdrop rewards in sync with tx finality.
      if (existingTransaction.rewardTransferType === "airdrop_claim") {
        const userReward = await UserAirdropReward.findOne({
          where: { splTokenSendTxId: existingTransaction.id },
        });

        if (userReward) {
          // Only mark as CLAIMED if validation passed
          if (isValid) {
            await userReward.update({ status: USER_AIRDROP_STATUS.CLAIMED });

            const pendingCount = await UserAirdropReward.count({
              where: {
                airdropRewardId: userReward.airdropRewardId,
                status: { [Op.ne]: USER_AIRDROP_STATUS.CLAIMED },
              },
            });

            if (pendingCount === 0) {
              await AirdropDetail.update(
                { status: AIRDROP_STATUS.COMPLETED },
                { where: { id: userReward.airdropRewardId } },
              );
            }
          } else {
            // Handle mismatched airdrop claim - reset to UNCLAIMED for retry
            await userReward.update({
              status: USER_AIRDROP_STATUS.UNCLAIMED,
              splTokenSendTxId: null,
            });
          }
        }
      }

      // Handle payout transactions - update claimedAmount in raffle table
      if (
        existingTransaction.rewardTransferType === "creator_payout" &&
        existingTransaction.raffleId
      ) {
        logger.info(
          `Processing payout transaction: ${existingTransaction.txId}, isValid: ${isValid}, status: ${existingTransaction.status}, raffleId: ${existingTransaction.raffleId}, uiAmount: ${existingTransaction.uiAmount}`,
        );

        // Handle successful transactions (either newly validated or already successful)
        const shouldUpdateClaimedAmount =
          isValid ||
          existingTransaction.status === SPL_TOKEN_SEND_TX_STATUS.SUCCESS;

        if (shouldUpdateClaimedAmount) {
          try {
            // Get raffle information to determine token type and decimals
            const currentRaffle = await Raffle.findOne({
              where: { id: existingTransaction.raffleId },
              attributes: [
                "id",
                "claimedAmount",
                "claimableAmount",
                "tokenType",
                "tokenAddress",
              ],
            });

            if (!currentRaffle) {
              logger.error(
                `Raffle not found for transaction ${existingTransaction.txId}`,
              );
            }

            let payoutAmount;
            let tokenSymbol;

            if (currentRaffle.tokenType === TOKEN_TYPE.SOLANA) {
              // SOL transaction - uiAmount in lamports
              payoutAmount =
                Number(existingTransaction.uiAmount) / LAMPORTS_PER_SOL;
              tokenSymbol = "SOL";
            } else {
              // SPL Token transaction - uiAmount is already in smallest token units
              // Convert back to human-readable amount using the stored decimals
              payoutAmount =
                Number(existingTransaction.uiAmount) /
                Math.pow(10, existingTransaction.decimals || 9);
              tokenSymbol = "SPL";
            }

            logger.info(
              `Attempting to update claimedAmount for raffle ${existingTransaction.raffleId}: +${payoutAmount} ${tokenSymbol} (uiAmount: ${existingTransaction.uiAmount}, decimals: ${existingTransaction.decimals})`,
            );

            if (parseFloat(currentRaffle.claimedAmount) === 0) {
              // Update the raffle's claimedAmount
              // Update the raffle's claimedAmount - handle string field properly
              const newClaimedAmount = (
                parseFloat(currentRaffle.claimedAmount || 0) + payoutAmount
              ).toString();

              await Raffle.update(
                { claimedAmount: newClaimedAmount },
                { where: { id: existingTransaction.raffleId } },
              );

              logger.info(
                `Updated claimedAmount for raffle ${existingTransaction.raffleId}: +${payoutAmount} ${tokenSymbol} (Transaction: ${existingTransaction.txId})`,
              );

              // Verify the update
              const updatedRaffle = await Raffle.findOne({
                where: { id: existingTransaction.raffleId },
                attributes: ["id", "claimedAmount", "claimableAmount"],
              });

              if (updatedRaffle) {
                logger.info(
                  `Raffle ${existingTransaction.raffleId} after update - claimedAmount: ${updatedRaffle.claimedAmount}, claimableAmount: ${updatedRaffle.claimableAmount}`,
                );

                // Get raffle owner for Socket.IO event
                const raffleOwner = await Raffle.findOne({
                  where: { id: existingTransaction.raffleId },
                  attributes: ["userId"],
                });

                if (raffleOwner) {
                  // Emit Socket.IO event for payout update
                  SocketService.emitPayoutUpdate(raffleOwner.userId, {
                    raffleId: existingTransaction.raffleId,
                    claimedAmount: updatedRaffle.claimedAmount,
                    claimableAmount: updatedRaffle.claimableAmount,
                    payoutAmount: payoutAmount,
                    transactionId: existingTransaction.id,
                    signature: existingTransaction.txId,
                    status: "confirmed",
                  });
                }
              }
            } else {
              logger.info(
                `Skipping claimedAmount update for raffle ${existingTransaction.raffleId} - already updated (current: ${currentRaffle?.claimedAmount})`,
              );
            }
          } catch (payoutError) {
            logger.error(
              `Failed to update claimedAmount for raffle ${existingTransaction.raffleId}:`,
              payoutError,
            );
          }
        } else {
          // Handle mismatched payout transactions - reset creatorClaimTxId
          try {
            //temporarily turning off reclaim for mismtached transactions
            // await Raffle.update(
            //   { creatorClaimTxId: null },
            //   {
            //     where: {
            //       id: existingTransaction.raffleId,
            //       creatorClaimTxId: existingTransaction.id,
            //     },
            //   },
            // );

            logger.info(
              `Reset creatorClaimTxId for raffle ${existingTransaction.raffleId} due to mismatched payout transaction ${existingTransaction.txId}`,
            );
          } catch (resetError) {
            logger.error(
              `Failed to reset creatorClaimTxId for raffle ${existingTransaction.raffleId}:`,
              resetError,
            );
          }
        }
      }
    });

    await Promise.all(successfulTransactionsToUpdate);

    if (op.failedTransactions.length > 0) {
      const failedTxIds = op.failedTransactions;

      await SplTokenSendTransaction.update(
        { status: SPL_TOKEN_SEND_TX_STATUS.FAILED },
        {
          where: {
            txId: { [Op.in]: failedTxIds },
          },
        },
      );

      // Handle failed payout transactions - reset creatorClaimTxId in raffle table
      const failedPayoutTxRecords = await SplTokenSendTransaction.findAll({
        where: {
          txId: { [Op.in]: failedTxIds },
          rewardTransferType: "creator_payout",
          raffleId: { [Op.not]: null },
        },
        attributes: ["id", "raffleId", "txId"],
      });

      if (failedPayoutTxRecords.length > 0) {
        for (const failedTx of failedPayoutTxRecords) {
          try {
            await Raffle.update(
              { creatorClaimTxId: null },
              {
                where: { id: failedTx.raffleId, creatorClaimTxId: failedTx.id },
              },
            );

            logger.info(
              `Reset creatorClaimTxId for raffle ${failedTx.raffleId} due to failed payout transaction ${failedTx.txId}`,
            );
          } catch (resetError) {
            logger.error(
              `Failed to reset creatorClaimTxId for raffle ${failedTx.raffleId}:`,
              resetError,
            );
          }
        }
      }

      // Failed airdrop claim tx should become claimable again.
      const failedAirdropTxRecords = await SplTokenSendTransaction.findAll({
        where: {
          txId: { [Op.in]: failedTxIds },
          rewardTransferType: "airdrop_claim",
        },
        attributes: ["id", "txId"],
      });

      if (failedAirdropTxRecords.length > 0) {
        const failedAirdropTxIds = failedAirdropTxRecords.map(
          (txRecord) => txRecord.id,
        );

        await UserAirdropReward.update(
          {
            status: USER_AIRDROP_STATUS.UNCLAIMED,
            splTokenSendTxId: null,
          },
          {
            where: {
              splTokenSendTxId: { [Op.in]: failedAirdropTxIds },
              status: { [Op.ne]: USER_AIRDROP_STATUS.CLAIMED },
            },
          },
        );

        logger.info(
          `Reset ${failedAirdropTxIds.length} failed airdrop claim rewards back to UNCLAIMED`,
        );
      }

      // Set rewardClaimTxId to null in game_rewards table for failed tx
      //   const failedTxRecords = await SplTokenSendTransaction.findAll({
      //     where: {
      //       txId: { [Op.in]: failedTxIds },
      //     },
      //     attributes: ["id"],
      //   });

      //   const failedIds = failedTxRecords.map((record) => record.id);

      //   if (failedIds.length > 0) {
      //     await GameReward.update(
      //       { rewardClaimTxId: null },
      //       {
      //         where: {
      //           rewardClaimTxId: { [Op.in]: failedIds },
      //         },
      //       }
      //     );
      //   }
    }
  } catch (error) {
    logger.error("Error in updateDbAndConfirmTransactions", error);
  }
};

module.exports = {
  getSplTokenSendTransactions,
  updateDbAndConfirmTransactions,
};
