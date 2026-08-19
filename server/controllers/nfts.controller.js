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
const VERIFIED_COLLECTION_MATCH_TYPES = {
  COLLECTION: "collection",
  CREATOR: "creator",
};

const normalizeIpfsUri = (value) => {
  if (!value) return null;

  const uri = String(value).trim();
  if (!uri) return null;

  if (!uri.startsWith("ipfs://")) {
    return uri;
  }

  let path = uri.slice(7);
  if (path.startsWith("ipfs/")) {
    path = path.slice(5);
  }

  return `https://gateway.pinata.cloud/ipfs/${path}`;
};

const getAssetImage = (item) => {
  const fileImage = item?.content?.files?.find((file) => {
    const uri = file?.cdn_uri || file?.uri;
    const mime = String(file?.mime || "").toLowerCase();
    return uri && (!mime || mime.startsWith("image/"));
  });

  return (
    normalizeIpfsUri(item?.content?.links?.image) ||
    normalizeIpfsUri(item?.links?.image) ||
    normalizeIpfsUri(item?.content?.metadata?.image) ||
    normalizeIpfsUri(item?.content?.json?.image) ||
    normalizeIpfsUri(item?.content?.json?.image_url) ||
    normalizeIpfsUri(item?.content?.json?.properties?.files?.[0]?.uri) ||
    normalizeIpfsUri(fileImage?.cdn_uri) ||
    normalizeIpfsUri(fileImage?.uri) ||
    null
  );
};

const normalizeMatchType = (value) => {
  return value === VERIFIED_COLLECTION_MATCH_TYPES.CREATOR
    ? VERIFIED_COLLECTION_MATCH_TYPES.CREATOR
    : VERIFIED_COLLECTION_MATCH_TYPES.COLLECTION;
};

const getCollectionGroupValues = (item) => {
  return (Array.isArray(item?.grouping) ? item.grouping : [])
    .filter((group) => group?.group_key === "collection" && group?.group_value)
    .map((group) => group.group_value);
};

const getVerifiedCreatorAddresses = (item) => {
  return (Array.isArray(item?.creators) ? item.creators : [])
    .filter((creator) => creator?.address && creator?.verified)
    .map((creator) => creator.address);
};

const toVerifiedCollectionSets = (collections) => {
  const grouped = {
    collection: new Set(),
    creator: new Set(),
  };

  for (const collection of collections) {
    if (!collection?.address) {
      continue;
    }

    grouped[normalizeMatchType(collection.matchType)].add(collection.address);
  }

  return grouped;
};

const matchesVerifiedCollection = (item, verifiedSets) => {
  const collectionGroups = getCollectionGroupValues(item);
  if (collectionGroups.some((address) => verifiedSets.collection.has(address))) {
    return true;
  }

  const creatorAddresses = getVerifiedCreatorAddresses(item);
  return creatorAddresses.some((address) => verifiedSets.creator.has(address));
};

const mapAssetForResponse = (item) => ({
  mint: item.id,
  name: item.content?.metadata?.name,
  uri: normalizeIpfsUri(item.content?.json_uri),
  image: getAssetImage(item),
  interface: item.interface,
  grouping: item.grouping,
  collection: getCollectionGroupValues(item)[0] || null,
  creators: getVerifiedCreatorAddresses(item),
  ownership: item.ownership,
});

const fetchAllAssetsByOwner = async (owner) => {
  const items = [];
  let page = 1;

  while (true) {
    const assets = await getUmi().rpc.searchAssets({
      owner: publicKey(owner),
      burnt: false,
      page,
    });

    items.push(...(assets?.items || []));

    if ((assets?.items || []).length < 1000) {
      break;
    }

    page += 1;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return items;
};

class HolderController {
  static async getUserNftsFromCollection(req, res) {
    try {
      const userId = req.payload.id;
      const user = await User.findOne({ where: { id: userId } });

      const pubkey = user.pubkey;

      const verifiedCollections = await VerifiedCollection.findAll({
        where: { isVerified: COLLECTION_ISVERIFIED.TRUE },
        attributes: ["address", "name", "matchType"],
        raw: true,
      });

      if (!verifiedCollections.length) {
        return respond(res, httpStatus.OK, "No verified collections found", {
          total: 0,
          nfts: [],
        });
      }

      const verifiedSets = toVerifiedCollectionSets(verifiedCollections);
      const cacheTokens = verifiedCollections
        .map(
          (collection) =>
            `${normalizeMatchType(collection.matchType)}:${collection.address}`
        )
        .sort();

      const cacheKey = `nfts:collection:v3:${pubkey}:${cacheTokens.join(
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

      const allItems = await fetchAllAssetsByOwner(pubkey);

      const uniqueNftsMap = new Map();
      for (const item of allItems.filter((asset) =>
        matchesVerifiedCollection(asset, verifiedSets)
      )) {
        uniqueNftsMap.set(item.id, item);
      }

      const nfts = Array.from(uniqueNftsMap.values()).map(mapAssetForResponse);

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
        where: {
          isVerified: true,
        },
      });
      const verifiedSets = toVerifiedCollectionSets(allVerifiedCollections);

      const cacheKey = `nfts:all:v3:${pubkey}`;

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

      const assets = await fetchAllAssetsByOwner(pubkey);
      const nfts = assets
        .filter((item) => matchesVerifiedCollection(item, verifiedSets))
        .map(mapAssetForResponse);


      const responseData = {
        total: nfts.length || 0,
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
