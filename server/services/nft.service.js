const logger = require("../util/logger");
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

class NFTService {
  static async checkNFTCollectionHolder(pubkey) {
    try {
      if (!pubkey) {
        throw new Error("Missing wallet address");
      }

      const cacheKey = `nfts:collection:${pubkey}:${
        COLLECTION_ADDRESS || "all"
      }`;

      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return {
          isHolder: cachedData.total > 0,
          nftCount: cachedData.total,
          total: cachedData.total,
          nfts: cachedData.nfts,
          cached: true,
          timestamp: cachedData.timestamp,
        };
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

      // Cache the result
      await redisClient.set(cacheKey, responseData, CACHE_TTL);
      logger.info(`Cached data for key: ${cacheKey} with TTL ${CACHE_TTL}s`);

      return {
        isHolder: result.total > 0,
        nftCount: result.total,
        total: result.total,
        nfts: nfts,
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
