const { Op } = require("sequelize");
const { SplTokenSendTransaction, GameReward } = require("../models");
const {
  SPL_TOKEN_SEND_TX_STATUS,
  SPL_TOKEN_SEND_TRANSACTION_TYPE,
} = require("../config/data");
const { DEFAULT_COMMISSION } = require("../config/constants");
const { LAMPORTS_PER_SOL } = require("@solana/web3.js");
const logger = require("../util/logger");

const getSplTokenSendTransactions = async () => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 minutes ago
  const oneMinuteAgo = now - 1 * 60 * 1000; // 1 minute ago

  const rows = await SplTokenSendTransaction.findAll({
    where: {
      txId: { [Op.not]: null },
      status: SPL_TOKEN_SEND_TX_STATUS.PENDING,
      createdAt: {
        [Op.between]: [new Date(fiveMinutesAgo), new Date(oneMinuteAgo)],
      },
    },
    limit: 5,
    order: [["createdAt", "DESC"]],
  });

  console.log("rows: ", rows);

  return rows.map((row) => {
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

      if (tx.details.txType === SPL_TOKEN_SEND_TRANSACTION_TYPE.MULTIPLE) {
        existingTransaction.status = SPL_TOKEN_SEND_TX_STATUS.SUCCESS;
        await existingTransaction.save();
        return;
      }

      const commissionInLamports = DEFAULT_COMMISSION * LAMPORTS_PER_SOL;
      const checks = () => {
        if (tx.details.txType === "solana") {
          return tx.details.amounts.some(
            (amount) =>
              amount ===
                Number(existingTransaction.uiAmount) + commissionInLamports || // <-- transferring commission and amount to same wallet.
              amount === Number(existingTransaction.uiAmount)
          );
        }
        return Number(existingTransaction.uiAmount) === tx.details.amount;
      };

      const isValid = checks();
      existingTransaction.status = isValid
        ? SPL_TOKEN_SEND_TX_STATUS.SUCCESS
        : SPL_TOKEN_SEND_TX_STATUS.MISMATCHED;

      await existingTransaction.save();
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
        }
      );

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
