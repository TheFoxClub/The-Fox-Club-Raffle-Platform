const { User } = require("../models");
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
const { getUmi } = require("../config/solana");

const CACHE_TTL = process.env.REDIS_TTL || 300;
const { VerifiedCollection } = require("../models");
const { COLLECTION_ISVERIFIED } = require("../config/data");

class HolderController {
  static async getUserNftsFromCollection(req, res) {
    try {
      const userId = req.payload.id;
      const user = await User.findOne({ where: { id: userId } });

      const pubkey = user.pubkey;

      const verifiedCollections = await VerifiedCollection.findAll({
        where: { isVerified: COLLECTION_ISVERIFIED.TRUE },
        attributes: ["address", "name"],
        raw: true,
      });

      if (!verifiedCollections.length) {
        return respond(res, httpStatus.OK, "No verified collections found", {
          total: 0,
          nfts: [],
        });
      }

      const collectionAddresses = verifiedCollections.map((c) => c.address);

      const cacheKey = `nfts:collection:${pubkey}:${collectionAddresses.join(
        ","
      )}`;

      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return respond(
          res,
          httpStatus.OK,
          "NFTs fetched successfully (cached)!",
          {
            ...cachedData,
            cached: true,
          }
        );
      }

      logger.info(`Cache miss for key: ${cacheKey}, fetching from blockchain`);

      let allItems = [];

      for (const collection of collectionAddresses) {
        const result = await getUmi().rpc.searchAssets({
          owner: publicKey(pubkey),
          grouping: ["collection", collection],
        });

        if (result?.items?.length) {
          allItems.push(...result.items);
        }
      }

      const uniqueNftsMap = new Map();
      for (const item of allItems) {
        uniqueNftsMap.set(item.id, item);
      }

      const nfts = Array.from(uniqueNftsMap.values()).map((item) => ({
        mint: item.id,
        name: item.content?.metadata?.name,
        uri: item.content?.json_uri,
        interface: item.interface,
        grouping: item.grouping,
        ownership: item.ownership,
      }));

      const responseData = {
        total: nfts.length,
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
        { error: err.message }
      );
    }
  }

  static async getUserNfts(req, res) {
    try {
      const { pubkey } = req.params;

      if (!pubkey) {
        return respond(res, httpStatus.BAD_REQUEST, "Missing wallet address");
      }

      //filtering nfts with collections
      const allVerifiedCollections = await VerifiedCollection.findAll({
        raw: true,
      });
      const verifiedCollectionAddresses = allVerifiedCollections.map(
        (item) => item.address
      );

      const cacheKey = `nfts:all:${pubkey}`;

      let cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return respond(
          res,
          httpStatus.OK,
          "NFTs fetched successfully (cached)!",
          {
            total: cachedData.total || 0,
            nfts: cachedData.nfts || [],
            cached: true,
            timestamp: cachedData.timestamp,
          }
        );
      }

      logger.info(`Cache miss for key: ${cacheKey}, fetching from blockchain`);

      const searchParams = {
        owner: publicKey(pubkey),
      };

      let result;
      let nfts;

      //filtering verified collections
      if (allVerifiedCollections.length > 0) {
        result = await getUmi().rpc.searchAssets(searchParams);

        nfts = result.items.map((item) => ({
          mint: item.id,
          name: item.content?.metadata?.name,
          uri: item.content?.json_uri,
          interface: item.interface,
          collection: item.grouping[0],
          image: item.links?.image || item.content.files?.[0]?.uri,
          ownership: item.ownership,
        }));
        nfts = nfts.filter((item) =>
          verifiedCollectionAddresses.includes(item.collection?.group_value)
        );
      } else {
        nfts = [];
      }

      const responseData = {
        total: result?.total || 0,
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
