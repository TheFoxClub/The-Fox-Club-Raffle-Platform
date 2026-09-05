const axios = require("axios");
const { publicKey } = require("@metaplex-foundation/umi");
const { getUmi } = require("../config/solana");
const { ORBIS_API_KEY } = require("../config/credentials");
const { VerifiedCollection } = require("../models");
const redisClient = require("../util/redisClient");
const logger = require("../util/logger");

const ORBIS_COLLECTION_URL = "https://www.orbisonsol.io/api/mp-public?action=collection&collectionAddress=";
const ORBIS_MARKETPLACE_URL = "https://www.orbisonsol.io/api/marketplace";
const CACHE_TTL_SECONDS = 600;
const ORBIS_SLUG_BY_VERIFIED_CREATOR = new Map([
  ["93rdYLiemLiyGwPqVSpjWmtqk3Uy3s7Eexn79jZLycPP", "brohalla"],
]);

const getLegacyOrbisSlug = async (reward) => {
  if (!reward.mintAddress) return null;

  const asset = await getUmi().rpc.getAsset(publicKey(reward.mintAddress));
  if (asset.grouping?.some((group) => group.group_key === "collection")) {
    return null;
  }

  const verifiedCreator = asset.creators?.find(
    (creator) => creator.verified && creator.address,
  )?.address;
  if (verifiedCreator && ORBIS_SLUG_BY_VERIFIED_CREATOR.has(verifiedCreator)) {
    return ORBIS_SLUG_BY_VERIFIED_CREATOR.get(verifiedCreator);
  }

  return asset.content?.metadata?.name
    ?.replace(/\s+#\d+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || null;
};

const getLegacyFloorPrice = async (slug) => {
  if (!slug) return null;

  const cacheKey = `orbis:floor:slug:${slug}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return cached;

  const projectResponse = await axios.post(
    ORBIS_MARKETPLACE_URL,
    { action: "getProject", pathname: slug },
    { timeout: 10000 },
  );
  const project = projectResponse.data?.project;
  const floorPrice = Number(project?.stats?.floorPrice);
  if (!Number.isFinite(floorPrice)) return null;

  const result = {
    amount: floorPrice,
    collectionAddress: slug,
    collectionName: project?.name || null,
  };
  await redisClient.set(cacheKey, result, CACHE_TTL_SECONDS);
  return result;
};

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
  if (Number(reward.rewardType) !== 0 && reward.rewardType !== "NFT") return null;

  try {
    const collectionAddress = await getCollectionAddress(reward);
    if (collectionAddress && ORBIS_API_KEY) {
      const cacheKey = `orbis:floor:${collectionAddress}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${ORBIS_COLLECTION_URL}${encodeURIComponent(collectionAddress)}`, {
        headers: { "X-API-Key": ORBIS_API_KEY },
        timeout: 10000,
      });
      const floorPrice = Number(response.data?.data?.stats?.floorPrice);
      if (Number.isFinite(floorPrice)) {
        const result = { amount: floorPrice, collectionAddress, collectionName: response.data?.data?.name || null };
        await redisClient.set(cacheKey, result, CACHE_TTL_SECONDS);
        return result;
      }
    }

    return getLegacyFloorPrice(await getLegacyOrbisSlug(reward));
  } catch (error) {
    try {
      return getLegacyFloorPrice(await getLegacyOrbisSlug(reward));
    } catch (legacyError) {
      logger.warn(`Unable to retrieve Orbis floor price: ${legacyError.message}`);
      return null;
    }
  }
};

module.exports = { getFloorPrice };