const { PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { getConnection } = require("../config/solana");
const logger = require("./logger");
const {
  getAssociatedTokenAddress,
  TokenAccountNotFoundError,
  getAssociatedTokenAddressSync,
} = require("@solana/spl-token");
const { getFeeData } = require("../helpers/cache/system-fee");
const { getTransactionFeeAmount } = require("./platformFee");

const solanaBalanceChecker = async (pubkey, requiredSolBalance) => {
  try {
    const balance = await getConnection().getBalance(new PublicKey(pubkey));
    if (balance <= requiredSolBalance * LAMPORTS_PER_SOL) {
      return {
        success: false,
        message: "Insufficient SOL",
      };
    }
    return {
      success: true,
      message: "",
    };
  } catch (error) {
    logger.error("Error in solanaBalance checker: ", error);
    return {
        success: false,
        message: "Insufficient SOL"
    };
  }
};

const tokenBalanceChecker = async (
  pubkey,
  mintAddress,
  requiredTokenBalance,
  { waivePlatformFees = false } = {},
) => {
  try {
    const buyerAta = getAssociatedTokenAddressSync(
      new PublicKey(mintAddress),
      new PublicKey(pubkey),
    );
    const ataTokenDetails =
      await getConnection().getTokenAccountBalance(buyerAta);

    const tokenBalance = Number(ataTokenDetails.value.amount);
    if (BigInt(tokenBalance) < requiredTokenBalance) {
      return {
        success: false,
        message: "Insufficient token balance",
      };
    }

    const fee = await getFeeData();
    const hasEnoughSolBalance = await solanaBalanceChecker(
      pubkey,
      getTransactionFeeAmount(fee, { waivePlatformFees }),
    )
    if(hasEnoughSolBalance.success === false){
        return hasEnoughSolBalance
    }

    return {
      success: true,
      message: "",
    };
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError) {
      logger.error(
        `Error in tokenBalanceChecker: ${pubkey} does not have required token account`,
      );
    }
    logger.error("Error in tokenBalanceChecker: ", error);
    return {
      success: false,
      message: "Insufficient token balance",
    };
  }
};

module.exports = { solanaBalanceChecker, tokenBalanceChecker };
