const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { dasApi } = require("@metaplex-foundation/digital-asset-standard-api");
const { publicKey } = require("@metaplex-foundation/umi");
const {
  COLLECTION_ADDRESS,
  SOLANA_RPC_POOL_DAS_API,
} = require("../config/credentials");
const redisClient = require("../util/redisClient");

const umi = createUmi(SOLANA_RPC_POOL_DAS_API).use(dasApi());

const CACHE_TTL = process.env.REDIS_TTL || 300;

class HolderController {
  static async getUserNftsFromCollection(req, res) {
    try {
      const { pubkey } = req.params;

      if (!pubkey) {
        return respond(res, httpStatus.BAD_REQUEST, "Missing wallet address");
      }

      const cacheKey = `nfts:collection:${pubkey}:${
        COLLECTION_ADDRESS || "all"
      }`;

      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return respond(
          res,
          httpStatus.OK,
          "NFTs fetched successfully (cached)!",
          {
            total: cachedData.total,
            nfts: cachedData.nfts,
            cached: true,
            timestamp: cachedData.timestamp,
          }
        );
      }

      logger.info(`Cache miss for key: ${cacheKey}, fetching from blockchain`);

      const searchParams = {
        owner: publicKey(pubkey),
      };

      const collection = COLLECTION_ADDRESS;
      if (collection) {
        searchParams.grouping = ["collection", collection];
      }

      const result = await umi.rpc.searchAssets(searchParams);

      const nfts = result.items.map((item) => ({
        mint: item.id,
        name: item.content?.metadata?.name,
        uri: item.content?.json_uri,
        interface: item.interface,
        grouping: item.grouping,
        ownership: item.ownership,
      }));

      const responseData = {
        total: result.total,
        nfts,
        timestamp: new Date().toISOString(),
      };

      await redisClient.set(cacheKey, responseData, CACHE_TTL);
      logger.info(`Cached data for key: ${cacheKey} with TTL ${CACHE_TTL}s`);

      return respond(res, httpStatus.OK, "NFTs fetched successfully!", {
        ...responseData,
        cached: false,
      });
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to fetch NFTs.",
        {
          error: err.message,
        }
      );
    }
  }

  static async getUserNfts(req, res) {
    try {
      const { pubkey } = req.params;

      if (!pubkey) {
        return respond(res, httpStatus.BAD_REQUEST, "Missing wallet address");
      }

      const cacheKey = `nfts:all:${pubkey}`;

      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return respond(
          res,
          httpStatus.OK,
          "NFTs fetched successfully (cached)!",
          {
            total: cachedData.total,
            nfts: cachedData.nfts,
            cached: true,
            timestamp: cachedData.timestamp,
          }
        );
      }

      logger.info(`Cache miss for key: ${cacheKey}, fetching from blockchain`);

      const searchParams = {
        owner: publicKey(pubkey),
      };

      const result = await umi.rpc.searchAssets(searchParams);

      const nfts = result.items.map((item) => ({
        mint: item.id,
        name: item.content?.metadata?.name,
        uri: item.content?.json_uri,
        interface: item.interface,
        grouping: item.grouping,
        ownership: item.ownership,
      }));

      const responseData = {
        total: result.total,
        nfts,
        timestamp: new Date().toISOString(),
      };

      await redisClient.set(cacheKey, responseData, CACHE_TTL);
      logger.info(`Cached data for key: ${cacheKey} with TTL ${CACHE_TTL}s`);

      return respond(res, httpStatus.OK, "NFTs fetched successfully!", {
        ...responseData,
        cached: false,
      });
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to fetch NFTs.",
        {
          error: err.message,
        }
      );
    }
  }

  static async clearUserNftsCache(req, res) {
    try {
      const { pubkey } = req.params;

      if (!pubkey) {
        return respond(res, httpStatus.BAD_REQUEST, "Missing wallet address");
      }

      const collectionKey = `nfts:collection:${pubkey}:${
        COLLECTION_ADDRESS || "all"
      }`;
      const allKey = `nfts:all:${pubkey}`;

      await redisClient.del(collectionKey);
      await redisClient.del(allKey);

      logger.info(`Cache cleared for user: ${pubkey}`);

      return respond(res, httpStatus.OK, "Cache cleared successfully!");
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to clear cache.",
        {
          error: err.message,
        }
      );
    }
  }

  static async getCacheStats(req, res) {
    try {
      return respond(res, httpStatus.OK, "Cache stats", {
        enabled: true,
        ttl: CACHE_TTL,
        clientStatus: redisClient.client?.status || "unknown",
      });
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to get cache stats.",
        {
          error: err.message,
        }
      );
    }
  }
}

module.exports = HolderController;
