const logger = require("../util/logger");
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

class NFTService {
  static async checkNFTCollectionHolder(pubkey) {
    try {
      if (!pubkey) {
        throw new Error("Missing wallet address");
      }

      const collections = Array.isArray(COLLECTION_ADDRESS)
        ? COLLECTION_ADDRESS
        : [COLLECTION_ADDRESS];

      const normalizedCollections = collections.filter(Boolean).sort();
      const cacheKey = `nfts:collection:${pubkey}:${
        normalizedCollections.join(",") || "all"
      }`;

      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        const parsed = JSON.parse(cachedData);

        logger.info(`Cache hit for key: ${cacheKey}`);

        return {
          isHolder: parsed.total > 0,
          nftCount: parsed.total,
          total: parsed.total,
          nfts: parsed.nfts,
          cached: true,
          timestamp: parsed.timestamp,
        };
      }

      logger.info(`Cache miss for key: ${cacheKey}, fetching from blockchain`);

      let nfts = [];
      let total = 0;

      for (const collection of normalizedCollections) {
        const searchParams = {
          owner: publicKey(pubkey),
          grouping: ["collection", collection],
        };

        const result = await getUmi().rpc.searchAssets(searchParams);

        const items = result.items.map((item) => ({
          mint: item.id,
          name: item.content?.metadata?.name,
          uri: item.content?.json_uri,
          interface: item.interface,
          grouping: item.grouping,
          ownership: item.ownership,
        }));

        nfts.push(...items);
        total += result.total;
      }

      const responseData = {
        total,
        nfts,
        timestamp: new Date().toISOString(),
      };

      await redisClient.set(
        cacheKey,
        JSON.stringify(responseData),
        "EX",
        CACHE_TTL
      );

      logger.info(`Cached data for key: ${cacheKey} with TTL ${CACHE_TTL}s`);

      return {
        isHolder: total > 0,
        nftCount: total,
        total,
        nfts,
        cached: false,
        timestamp: responseData.timestamp,
      };
    } catch (error) {
      logger.error("Error checking NFT holder status:", error);
      return {
        isHolder: false,
        nftCount: 0,
        error: error.message,
      };
    }
  }
}

module.exports = NFTService;
