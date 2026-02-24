const redisClient = require("../../util/redisClient");
const { SystemFee } = require("../../models");
const logger = require("../../util/logger");

const getFeeData = async () => {
  const cacheKey = "systemFee:id:1"; // A unique key to store the fee data in Redis
  // First, try to fetch the data from Redis
  const cachedFeeData = await redisClient.get(cacheKey);

  if (cachedFeeData) {
    logger.info("Cache Hit: For System Fee");
    return JSON.parse(cachedFeeData); // Parse the JSON string back to an object
  } else {
    logger.info("Cache Miss: For System Fee");
    const feeData = await SystemFee.findOne({
      where: {
        id: 1,
      },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      raw: true,
    });

    // If found, cache the result in Redis for future requests
    if (feeData) {
      redisClient.set(cacheKey, JSON.stringify(feeData), 3600); // Cache for 1 hour (3600 seconds)
    }

    return feeData;
  }
};

module.exports = { getFeeData };
