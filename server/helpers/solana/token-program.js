const { PublicKey } = require("@solana/web3.js");
const { getConnectionDas } = require("../../config/solana");
const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = require("@solana/spl-token");
const redisClient = require("../../util/redisClient");
const logger = require("../../util/logger");

const METADATA_CACHE_TTL = parseInt(process.env.METADATA_CACHE_TTL, 10) || 3600;

const applyTokenProgramId = (tokenDetail) => {
  if (!tokenDetail) return null;

  const tokenProgram = tokenDetail.tokenProgram || tokenDetail.program;
  switch (tokenProgram) {
    case "spl-token-2022":
      tokenDetail.tokenProgramId = TOKEN_2022_PROGRAM_ID;
      break;
    case "spl-token":
    default:
      tokenDetail.tokenProgramId = TOKEN_PROGRAM_ID;
      break;
  }

  return tokenDetail;
};

const getTokenDetail = async (tokenAddress) => {
  const cacheKey = `metadata:token:${tokenAddress}`;

  try {
    const cachedTokenDetail = await redisClient.get(cacheKey);
    if (cachedTokenDetail) {
      return applyTokenProgramId(cachedTokenDetail);
    }
  } catch (cacheErr) {
    logger.debug(`Token detail cache read failed for ${tokenAddress}: ${cacheErr.message}`);
  }

  const mintData = await getConnectionDas().getParsedAccountInfo(new PublicKey(tokenAddress));

  const tokenDetail = mintData.value?.data?.parsed?.info;
  if (!tokenDetail) {
    return null;
  }

  tokenDetail.tokenProgram = mintData.value?.data?.program || "spl-token";
  applyTokenProgramId(tokenDetail);

  if (tokenDetail?.extensions?.length > 0) {
    tokenDetail.extensions.forEach((element) => {
      if (element.extension === "transferFeeConfig") {
        tokenDetail.transferFeeConfig = element.state;
      }
    });
  }

  try {
    const tokenDetailForCache = {
      ...tokenDetail,
      tokenProgramId: undefined,
    };
    await redisClient.set(cacheKey, tokenDetailForCache, METADATA_CACHE_TTL);
  } catch (cacheErr) {
    logger.debug(`Token detail cache write failed for ${tokenAddress}: ${cacheErr.message}`);
  }

  return tokenDetail;
};

module.exports.getTokenDetail = getTokenDetail;
