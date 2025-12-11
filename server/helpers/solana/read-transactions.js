const { getConnectionDas } = require("../../config/solana");
const {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} = require("@solana/spl-token");
const logger = require("../../util/logger");
const { SPL_TOKEN_SEND_TRANSACTION_TYPE } = require("../../config/data");
const {
  getSplTokenSendTransactions,
  updateDbAndConfirmTransactions,
} = require("../../services/spl-transactions");

const connection = getConnectionDas();

const readTransactions = async (txs) => {
  try {
    let outputData = [];
    let failedTransactions = [];
    const txIds = txs.map((tx) => tx.txId);

    let data = [];

    // for (const txId of txIds) {
    //   try {
    //     const txData = await connection.getParsedTransaction(txId, {
    //       maxSupportedTransactionVersion: 0,
    //     });
    //     if (txData) {
    //       data.push(txData);
    //     }
    //   } catch (error) {
    //     logger.error(error);
    //     continue;
    //   }
    // }

    data = await connection.getParsedTransactions(txIds, {
      maxSupportedTransactionVersion: 0,
    });

    const filteredTxIds = data.map(
      (dataEntry) =>
        dataEntry?.transaction.signatures[0] &&
        dataEntry.transaction.signatures[0]
    );

    failedTransactions = txIds.filter((txId) => !filteredTxIds.includes(txId));

    for (let transaction of data) {
      if (!transaction) continue;

      const { signatures } = transaction.transaction;
      const [txId] = signatures;

      logger.info(`SPL TOKEN SEND TRANSACTIONS: Checking Transaction ${txId}`);

      if (transaction?.meta?.err) {
        failedTransactions.push(txId);
        continue;
      }

      const tx = txs.find((tx) => tx.txId === txId);

      const getTokenProgramId = () => {
        switch (tx.txType) {
          case SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN:
            return TOKEN_PROGRAM_ID.toString();
          case SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN_2022:
            return TOKEN_2022_PROGRAM_ID.toString();
          default:
            return null;
        }
      };

      const tokenProgramId = getTokenProgramId();

      const op = { details: {} };

      op.txId = transaction?.transaction.signatures[0];

      const preTokenBalances = transaction?.meta?.preTokenBalances || [];
      const postTokenBalances = transaction?.meta?.postTokenBalances || [];

      let object = {
        sender: "",
        receiver: "",
        amount: "",
        amounts: [],
        mint: "",
        txType: "",
      };

      const resetObject = () => {
        object.sender = "";
        object.receiver = "";
        object.amount = "";
        object.amounts = [];
        object.mint = "";
        object.txType = "";
      };

      switch (tx.txType) {
        case SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA:
          resetObject();
          const preBalances = transaction?.meta?.preBalances || [];
          const postBalances = transaction?.meta?.postBalances || [];
          const transactionFee = transaction?.meta?.fee || 0;
          const amounts = getAmounts(preBalances, postBalances);
          object.amounts = amounts;
          if (preBalances[0] < postBalances[0]) {
            object.amount = postBalances[0] - preBalances[0] - transactionFee;
          } else {
            object.amount = preBalances[0] - postBalances[0] - transactionFee;
          }
          object.txType = "solana";
          break;
        case SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN:
        case SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN_2022:
          resetObject();

          for (let postTokenBalance of postTokenBalances) {
            if (postTokenBalance.programId !== tokenProgramId) continue;

            const afterAmount =
              (postTokenBalance.uiTokenAmount.uiAmount || 0) *
              Math.pow(10, postTokenBalance.uiTokenAmount.decimals);

            const preTokenBalance = preTokenBalances.find(
              (p) => p.owner === postTokenBalance.owner
            );

            let prevAmount = 0;

            if (preTokenBalance) {
              prevAmount =
                (preTokenBalance.uiTokenAmount.uiAmount || 0) *
                Math.pow(10, preTokenBalance.uiTokenAmount.decimals);
            }

            const filterInstruction =
              transaction?.transaction?.message?.instructions.find(
                (instruction) =>
                  instruction?.program === "spl-token" &&
                  instruction?.parsed?.type === "transferCheckedWithFee"
              );

            if (prevAmount > afterAmount) {
              object.sender = postTokenBalance.owner;
            } else if (prevAmount < afterAmount) {
              object.receiver = postTokenBalance.owner;
              if (filterInstruction) {
                const { feeAmount, tokenAmount } =
                  filterInstruction.parsed?.info;
                object.amount =
                  Number(tokenAmount.amount) - Number(feeAmount.amount);
              } else {
                object.amount = afterAmount - prevAmount;
              }
            } else {
              continue;
            }

            if (!object.mint) {
              object.mint = postTokenBalance.mint;
            }
          }
          break;
        case SPL_TOKEN_SEND_TRANSACTION_TYPE.MULTIPLE:
          object.txType = SPL_TOKEN_SEND_TRANSACTION_TYPE.MULTIPLE;
        default:
          break;
      }
      op.details = { ...object };

      try {
        outputData.push({
          ...op,
        });
      } catch (err) {
        logger.error(`Error: `, op);
      }
    }
    return { outputData, failedTransactions };
  } catch (e) {
    throw new Error(e);
  }
};

const checkTransactions = async (txs) => {
  const op = await readTransactions(txs).catch((e) => {
    logger.info(`Error Reading Transactions:`, e);
  });
  op && (await updateDbAndConfirmTransactions(op));
  logger.info(`SPL TOKEN SEND TRANSACTIONS: Checking Completed`);
};

const checkSplTokenSendTransactions = async () => {
  logger.info("SPL TOKEN SEND TRANSACTIONS: Checking Started");
  const txs = await getSplTokenSendTransactions();
  await checkTransactions(txs);
};

const getAmounts = (preBalances, postBalances) => {
  if (preBalances.length !== postBalances.length) {
    throw new Error("Length of preBalances and postBalances must be equal");
  }

  const amounts = preBalances
    .slice(1)
    .map((preBalance, idx) => Math.abs(preBalance - postBalances[idx + 1]));

  return amounts.filter((amount) => amount !== 0);
};

module.exports = {
  checkSplTokenSendTransactions,
};
