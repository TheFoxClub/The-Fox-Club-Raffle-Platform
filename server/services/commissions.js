const {
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const logger = require("../util/logger");
const { DEFAULT_COMMISSION } = require("../config/constants");

const TOTAL_COMMISSION = DEFAULT_COMMISSION; // fixed commission

const COMMISSION_DISTRIBUTION = {
  // "2aqiXA5iUobxSqQHs7QrkxRbVZwNKkLpNUesppwEwWTv": 1,
};

const addCommissionToTransaction = async ({ transaction, senderPubkey }) => {
  try {
    const totalCommissionInLamports = TOTAL_COMMISSION * LAMPORTS_PER_SOL;
    for (const [key, value] of Object.entries(COMMISSION_DISTRIBUTION)) {
      try {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(senderPubkey),
            toPubkey: new PublicKey(key),
            lamports: BigInt(totalCommissionInLamports * value),
          })
        );
      } catch (error) {
        logger.error(error);
        continue;
      }
    }
    return transaction;
  } catch (error) {
    logger.error("Error while adding commission:", error);
    return transaction;
  }
};

module.exports = { addCommissionToTransaction };
