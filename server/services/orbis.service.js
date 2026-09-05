const axios = require("axios");
const { publicKey } = require("@metaplex-foundation/umi");
const { getUmi } = require("../config/solana");
const { ORBIS_API_KEY } = require("../config/credentials");
const { VerifiedCollection } = require("../models");
const redisClient = require("../util/redisClient");
const logger = require("../util/logger");

const ORBIS_COLLECTION_URL = "https://www.orbisonsol.io/api/mp-public?action=collection&collectionAddress=";
const CACHE_TTL_SECONDS = 600;

const getCollectionAddress = async (reward) => {
  try {
    const metadata = typeof reward.metadataJson === "string"
      ? JSON.parse(JSON.parse(reward.metadataJson))
      : reward.metadataJson;
    if (metadata?.collection) return metadata.collection;
  } catch {
    // Older rewards may contain only the NFT mint.
  }

  if (!reward.mintAddress) return null;
  const asset = await getUmi().rpc.getAsset(publicKey(reward.mintAddress));
  const collectionAddress = asset.grouping?.find(
    (group) => group.group_key === "collection",
  )?.group_value;
  if (collectionAddress) return collectionAddress;

  const verifiedCreator = asset.creators?.find(
    (creator) => creator.verified && creator.address,
  )?.address;
  if (!verifiedCreator) return null;

  const creatorCollection = await VerifiedCollection.findOne({
    where: { address: verifiedCreator, isVerified: true },
    attributes: ["address", "name"],
  });
  const legacyCollectionName = asset.content?.metadata?.name
    ?.replace(/\s+#\d+$/, "")
    .trim();
  return creatorCollection?.name || legacyCollectionName || creatorCollection?.address || null;
};

const getFloorPrice = async (reward) => {
  if (!ORBIS_API_KEY || (Number(reward.rewardType) !== 0 && reward.rewardType !== "NFT")) return null;

  try {
    const collectionAddress = await getCollectionAddress(reward);
    if (!collectionAddress) return null;

    const cacheKey = `orbis:floor:${collectionAddress}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return cached;

    const response = await axios.get(`${ORBIS_COLLECTION_URL}${encodeURIComponent(collectionAddress)}`, {
      headers: { "X-API-Key": ORBIS_API_KEY },
      timeout: 10000,
    });
    const floorPrice = Number(response.data?.data?.stats?.floorPrice);
    if (!Number.isFinite(floorPrice)) return null;

    const result = { amount: floorPrice, collectionAddress, collectionName: response.data?.data?.name || null };
    await redisClient.set(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  } catch (error) {
    logger.warn(`Unable to retrieve Orbis floor price: ${error.message}`);
    return null;
  }
};

module.exports = { getFloorPrice };