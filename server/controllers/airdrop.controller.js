const { status: httpStatus } = require("http-status");
const { Op, QueryTypes } = require("sequelize");
const {
  User,
  UserInfo,
  XpTable,
  AirdropDetail,
  UserAirdropReward,
  SplTokenSendTransaction,
  sequelize,
} = require("../models");
const { getConnection } = require("../config/solana");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");
const { Transaction, VersionedTransaction } = require("@solana/web3.js");
const {
  fetchMetadataFromSeeds,
} = require("@metaplex-foundation/mpl-token-metadata");
const {
  createUmi,
} = require("@metaplex-foundation/umi-bundle-defaults");
const { publicKey } = require("@metaplex-foundation/umi");
const { default: bs58 } = require("bs58");
const axios = require("axios");

const {
  sendMultipleSplTokenTx,
  TRANSFER_DIRECTION,
  createAirdropClaimTransaction,
  submitTransactionToBlockchain,
} = require("../helpers/solana/spl-token-send-tx");
const { validateChecksum } = require("../helpers/solana/checksum-validation");
const { getFeeData } = require("../helpers/cache/system-fee");
const { AirdropWallet } = require("../helpers/solana/airdrop-wallet");
const redisClient = require("../util/redisClient");
const {
  RAFFLE_REWARD_TYPES,
  SPL_TOKEN_ADDRESS,
  SPL_TOKEN_SEND_TX_STATUS,
  SPL_TOKEN_SEND_TRANSACTION_TYPE,
} = require("../config/data");

const connection = getConnection();
const AIRDROP_STATUS = AirdropDetail.STATUS;
const REWARD_TYPE = AirdropDetail.REWARD_TYPE;
const USER_REWARD_STATUS = UserAirdropReward.STATUS;
const TOKEN_IMAGE_PLACEHOLDER = "/uploads/token-placeholder.png";
const METADATA_CACHE_TTL = parseInt(process.env.METADATA_CACHE_TTL, 10) || 3600;

const normalizeDateTimeInput = (value, boundary = "start") => {
  if (!value) return null;

  if (value instanceof Date) {
    return new Date(value);
  }

  const rawValue = String(value).trim();
  // Checks for Trailing Z (UTC) or timezone offset like +00:00 or -0700 to determine if it's already in ISO format with timezone
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(rawValue);

  if (hasTimezone) {
    return new Date(rawValue);
  }

  const normalizedValue = rawValue.includes(" ")
    ? rawValue.replace(" ", "T")
    : rawValue;

  // Checks for YYYY-MM-DDTHH:MM:SS.MS where SS and MS are optional. Eg: 2025-12-31T14:30:22.123
  const dateMatch = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/,
  );

  if (!dateMatch) {
    return new Date(normalizedValue);
  }

  const [, year, month, day, hour, minute, second, millisecond] = dateMatch;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      hour ? Number(hour) : boundary === "end" ? 23 : 0,
      minute ? Number(minute) : boundary === "end" ? 59 : 0,
      second ? Number(second) : 0,
      millisecond ? Number(millisecond.padEnd(3, "0")) : 0,
    ),
  );
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

  const gateway = "https://gateway.pinata.cloud/ipfs/";
  return `${gateway}${path}`;
};

const getAirdropTokenImage = async ({ rewardType, tokenAddress }) => {
  if (rewardType === REWARD_TYPE.SOL || !tokenAddress) {
    return TOKEN_IMAGE_PLACEHOLDER;
  }

  try {
    const metadataCacheKey = `metadata:mint:${tokenAddress}`;
    const metadataUriPayloadCacheKey = `metadata:mint-uri-payload:${tokenAddress}`;
    let metadata = (await redisClient.get(metadataCacheKey)) || {};
    let shouldUpdateMetadataCache = false;

    if (!metadata.uri) {
      logger.info(`Cache miss for metadata of token: ${tokenAddress}`);
      const umi = createUmi(connection);
      const fetchedMetadata = await fetchMetadataFromSeeds(umi, {
        mint: publicKey(tokenAddress),
      });

      metadata = {
        ...metadata,
        name: fetchedMetadata?.name || null,
        symbol: fetchedMetadata?.symbol || null,
        uri: fetchedMetadata?.uri || null,
      };
      shouldUpdateMetadataCache = true;
    }
    logger.info(`Cache hit for metadata of token: ${tokenAddress}`);

    const metadataUri = normalizeIpfsUri(metadata?.uri);
    let imageUrl = TOKEN_IMAGE_PLACEHOLDER;
    if (metadataUri) {
      let uriPayloadCache = await redisClient.get(metadataUriPayloadCacheKey);

      if (!uriPayloadCache) {
        logger.info(`Cache miss for json_uri payload of token: ${tokenAddress}`);
        try {
          const metadataResponse = await axios.get(metadataUri, {
            timeout: 8000,
            validateStatus: (status) => status >= 200 && status < 400,
          });

          uriPayloadCache = metadataResponse?.data || null;

          await redisClient.set(
            metadataUriPayloadCacheKey,
            uriPayloadCache,
            METADATA_CACHE_TTL,
          );
          logger.info(`Cached json_uri payload for token: ${tokenAddress}`);
        } catch (imageErr) {
          logger.warn(
            `Failed to resolve token image for ${tokenAddress}: ${imageErr.message}`,
          );
        }
      }

      imageUrl =
        normalizeIpfsUri(uriPayloadCache?.image) ||
        normalizeIpfsUri(uriPayloadCache?.logoURI) ||
        normalizeIpfsUri(uriPayloadCache?.image_url) ||
        normalizeIpfsUri(uriPayloadCache?.properties?.files?.[0]?.uri) ||
        TOKEN_IMAGE_PLACEHOLDER;
    }

    if (shouldUpdateMetadataCache) {
      await redisClient.set(metadataCacheKey, metadata, METADATA_CACHE_TTL);
    }

    return imageUrl;
  } catch (err) {
    logger.warn(
      `Failed to fetch token image for ${tokenAddress}: ${err.message}`,
    );
    return TOKEN_IMAGE_PLACEHOLDER;
  }
};

// Builds the ranking using the formula: user rank(position) = (amount of XP earned by user in the period / total XP earned by all users in the period) * total airdrop amount
const buildXpLeaderboardForRange = async ({
  rangeStart,
  rangeEnd,
  page = 1,
  limit = 10,
}) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const rawLimit = parseInt(limit, 10);
  const parsedLimit = rawLimit === -1 ? -1 : Math.max(rawLimit || 10, 1);

  const topEarners = await XpTable.findAll({
    attributes: [
      "userId",
      [sequelize.fn("SUM", sequelize.col("xpEarned")), "periodXp"],
      [sequelize.fn("SUM", sequelize.col("usdValue")), "periodUsdValue"],
      [sequelize.fn("COUNT", sequelize.col("XpTable.id")), "transactionCount"],
    ],
    where: {
      createdAt: {
        [Op.gte]: rangeStart,
        [Op.lte]: rangeEnd,
      },
    },
    group: ["userId"],
    order: [[sequelize.fn("SUM", sequelize.col("xpEarned")), "DESC"]],
    raw: true,
  });

  const totalParticipants = topEarners.length;
  let paginatedEarners;
  let totalPages;
  let offset = 0;

  if (parsedLimit === -1) {
    paginatedEarners = topEarners;
    totalPages = totalParticipants > 0 ? 1 : 0;
  } else {
    totalPages =
      totalParticipants > 0 ? Math.ceil(totalParticipants / parsedLimit) : 0;
    offset = (parsedPage - 1) * parsedLimit;
    paginatedEarners = topEarners.slice(offset, offset + parsedLimit);
  }

  const leaderboard = await Promise.all(
    paginatedEarners.map(async (earner, index) => {
      const user = await User.findByPk(earner.userId, {
        attributes: ["id", "pubkey", "totalXp"],
        include: [
          {
            model: UserInfo,
            attributes: ["username"],
            required: false,
          },
        ],
      });

      return {
        rank: offset + index + 1,
        userId: earner.userId,
        walletAddress: user?.pubkey || "Unknown",
        username: user?.user_info?.username || null,
        periodXp: parseFloat(earner.periodXp || 0),
        periodUsdValue: parseFloat(earner.periodUsdValue || 0),
        transactionCount: parseInt(earner.transactionCount || 0, 10),
        allTimeXp: parseFloat(user?.totalXp || 0),
      };
    }),
  );

  return {
    parsedPage,
    parsedLimit,
    totalParticipants,
    totalPages,
    leaderboard,
  };
};

const getMakeClaimablePlan = async ({ airdrop }) => {
  const now = new Date();
  const campaignEndDate = normalizeDateTimeInput(airdrop.endDate, "end");

  if (now < campaignEndDate) {
    throw new Error("Airdrop can only be made claimable after endDate is reached");
  }

  const config = airdrop.activationConfig || {};
  const hasLeaderboardLimit = Boolean(config.hasLeaderboardLimit);
  const configuredLimit = parseInt(config.leaderboardLimit, 10);
  const limit =
    hasLeaderboardLimit && !Number.isNaN(configuredLimit)
      ? Math.max(configuredLimit, 1)
      : -1;

  const rangeStart = normalizeDateTimeInput(airdrop.startDate, "start");
  const rangeEnd = normalizeDateTimeInput(airdrop.endDate, "end");

  const leaderboardData = await buildXpLeaderboardForRange({
    rangeStart,
    rangeEnd,
    page: 1,
    limit,
  });

  const validRecipients = leaderboardData.leaderboard.filter(
    (item) => item.walletAddress && item.walletAddress !== "Unknown",
  );

  if (!validRecipients.length) {
    throw new Error("No eligible recipients found for this airdrop range");
  }

  const parsedTotalAmount = parseFloat(airdrop.totalAmount || 0);
  const totalXp = validRecipients.reduce(
    (sum, user) => sum + parseFloat(user.periodXp || 0),
    0,
  );

  if (totalXp <= 0 || parsedTotalAmount <= 0) {
    throw new Error(
      "Cannot create rewards because total XP or total amount is invalid",
    );
  }

  const recipients = validRecipients.map((recipient) => {
    const userXp = parseFloat(recipient.periodXp || 0);
    const amount = parseFloat(((userXp / totalXp) * parsedTotalAmount).toFixed(9));

    return {
      pubKey: recipient.walletAddress,
      xp: userXp,
      amount,
    };
  });

  return {
    recipients,
    totalXp,
    totalAmount: parsedTotalAmount,
  };
};

const decodeSignedTransaction = (signedTransaction) => {
  const txBytes = Buffer.from(signedTransaction, "base64");

  try {
    return {
      tx: Transaction.from(txBytes),
      isVersioned: false,
    };
  } catch (legacyError) {
    return {
      tx: VersionedTransaction.deserialize(txBytes),
      isVersioned: true,
    };
  }
};

const getTransactionSignature = (tx, isVersioned) => {
  if (isVersioned) {
    if (!tx.signatures || !tx.signatures[0]) {
      throw new Error("Signed transaction is missing wallet signature");
    }
    return bs58.encode(tx.signatures[0]);
  }

  if (!tx.signature) {
    throw new Error("Signed transaction is missing wallet signature");
  }

  return bs58.encode(tx.signature);
};

const validateTransactionChecksum = (tx, isVersioned, checksum) => {
  try {
    const umi = createUmi(connection);
    let umiTx;

    if (isVersioned) {
      const versionedMessage = tx.message;
      const instructions = [];

      for (let i = 0; i < versionedMessage.compiledInstructions.length; i++) {
        const compiledIx = versionedMessage.compiledInstructions[i];
        instructions.push({
          programIndex: compiledIx.programIdIndex,
          accountIndexes: compiledIx.accountKeyIndexes,
          data: compiledIx.data,
        });
      }

      umiTx = {
        message: {
          accounts: versionedMessage.staticAccountKeys.map((key) =>
            publicKey(key.toBase58()),
          ),
          instructions,
          recentBlockhash: versionedMessage.recentBlockhash,
        },
      };
    } else {
      const compiledMessage = tx.compileMessage();
      umiTx = umi.transactions.create({
        version: "legacy",
        blockhash: compiledMessage.recentBlockhash,
        instructions: tx.instructions,
        payer: publicKey(tx.feePayer.toBase58()),
      });
    }

    return validateChecksum(umiTx.message, checksum);
  } catch (err) {
    logger.warn(`Checksum validation error: ${err.message}`);
    return false;
  }
};

class AirdropController {
  /**
   * Public periodic leaderboard based on the latest airdrop period.
   * Uses the latest airdrop period and ranks users by XP earned in that date range.
   */
  static async getLatestPeriodicLeaderboard(req, res) {
    try {
      const parsedPage = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const parsedLimit = Math.max(parseInt(req.query.limit, 10) || 50, 1);

      const latestAirdropRows = await sequelize.query(
        `
          SELECT id, airdropName, startDate, endDate, tokenSymbol, tokenAddress, imageUrl, createdAt
          FROM airdrop_details
          ORDER BY createdAt DESC
          LIMIT 1
        `,
        { type: QueryTypes.SELECT },
      );

      if (!latestAirdropRows.length) {
        return respond(res, httpStatus.OK, "No periodic airdrop data found", {
          airdrop: null,
          users: [],
          pagination: {
            total: 0,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: 0,
          },
        });
      }

      const latestAirdrop = latestAirdropRows[0];
      const rangeStart = normalizeDateTimeInput(latestAirdrop.startDate, "start");
      const rangeEnd = normalizeDateTimeInput(latestAirdrop.endDate, "end");

      if (
        Number.isNaN(rangeStart.getTime()) ||
        Number.isNaN(rangeEnd.getTime())
      ) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Latest airdrop has invalid startDate/endDate",
        );
      }

      const normalizedStartDate = rangeStart.toISOString();
      const normalizedEndDate = rangeEnd.toISOString();

      const leaderboardData = await buildXpLeaderboardForRange({
        rangeStart,
        rangeEnd,
        page: parsedPage,
        limit: parsedLimit,
      });

      return respond(
        res,
        httpStatus.OK,
        "Periodic leaderboard retrieved successfully",
        {
          airdrop: {
            id: latestAirdrop.id,
            airdropName: latestAirdrop.airdropName,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate,
            tokenSymbol: latestAirdrop.tokenSymbol || null,
            tokenAddress: latestAirdrop.tokenAddress || null,
            imageUrl: latestAirdrop.imageUrl || TOKEN_IMAGE_PLACEHOLDER,
            createdAt: latestAirdrop.createdAt,
          },
          users: leaderboardData.leaderboard,
          pagination: {
            total: leaderboardData.totalParticipants,
            page: leaderboardData.parsedPage,
            limit: leaderboardData.parsedLimit,
            totalPages: leaderboardData.totalPages,
          },
        },
      );
    } catch (err) {
      logger.error("Error fetching periodic XP leaderboard:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  /**
   * Get periodic XP leaderboard for airdrop recipient selection.
   */
  static async getXpLeaderboard(req, res) {
    try {
      const { startDate, endDate, page = 1, limit = 10 } = req.query;

      if (!startDate || !endDate) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "startDate and endDate are required for custom range",
        );
      }

      const rangeStart = normalizeDateTimeInput(startDate, "start");
      const rangeEnd = normalizeDateTimeInput(endDate, "end");

      if (
        Number.isNaN(rangeStart.getTime()) ||
        Number.isNaN(rangeEnd.getTime())
      ) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Invalid startDate or endDate format",
        );
      }

      if (rangeStart > rangeEnd) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "startDate cannot be after endDate",
        );
      }

      logger.info(
        `Fetching XP leaderboard from ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`,
      );

      const leaderboardData = await buildXpLeaderboardForRange({
        rangeStart,
        rangeEnd,
        page,
        limit,
      });

      return respond(
        res,
        httpStatus.OK,
        "Periodic XP leaderboard retrieved successfully",
        {
          period: {
            customRange: true,
            startDate: rangeStart.toISOString(),
            endDate: rangeEnd.toISOString(),
          },
          totalParticipants: leaderboardData.totalParticipants,
          leaderboard: leaderboardData.leaderboard,
          pagination: {
            total: leaderboardData.totalParticipants,
            page: leaderboardData.parsedPage,
            limit: leaderboardData.parsedLimit,
            totalPages: leaderboardData.totalPages,
          },
        },
      );
    } catch (err) {
      logger.error("Error fetching periodic XP leaderboard:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  /**
   * Get all airdrop reward campaigns with optional filtering
   */
  static async getAllAirdrops(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const whereClause = {};
      if (status !== undefined) {
        whereClause.status = parseInt(status);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: airdrops } = await AirdropDetail.findAndCountAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset,
        include: [
          {
            model: UserAirdropReward,
            as: "userAirdropRewards",
            attributes: ["id", "status"],
          },
        ],
      });

      const enrichedAirdrops = airdrops.map((airdrop) => {
        const data = airdrop.toJSON();
        const rewards = data.userAirdropRewards || [];
        const claimedCount = rewards.filter(
          (r) => r.status === USER_REWARD_STATUS.CLAIMED,
        ).length;

        return {
          id: data.id,
          airdropName: data.airdropName,
          startDate: data.startDate,
          endDate: data.endDate,
          totalAmount: data.totalAmount,
          type: data.type,
          tokenSymbol: data.tokenSymbol,
          imageUrl: data.imageUrl || TOKEN_IMAGE_PLACEHOLDER,
          status: data.status,
          createdAt: data.createdAt,
          claimedCount,
          totalReceivers: rewards.length,
        };
      });

      return respond(res, httpStatus.OK, "Airdrops retrieved successfully", {
        airdrops: enrichedAirdrops,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      });
    } catch (err) {
      logger.error("Error fetching airdrops:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  /**
   * Update airdrop campaign status
   */
  static async updateAirdropStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const airdrop = await AirdropDetail.findByPk(id);

      if (!airdrop) {
        return respond(res, httpStatus.NOT_FOUND, "Airdrop not found");
      }

      if (status === undefined) {
        return respond(res, httpStatus.BAD_REQUEST, "status is required");
      }

      const parsedStatus = parseInt(status, 10);

      if (Number.isNaN(parsedStatus)) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "status must be a valid integer",
        );
      }

      const validTransitions = {
        [AIRDROP_STATUS.FUNDED]: [AIRDROP_STATUS.CANCELLED],
        [AIRDROP_STATUS.ACTIVE]: [
          AIRDROP_STATUS.COMPLETED,
          AIRDROP_STATUS.CANCELLED,
        ],
        [AIRDROP_STATUS.COMPLETED]: [],
        [AIRDROP_STATUS.CANCELLED]: [],
      };

      if (!validTransitions[airdrop.status]?.includes(parsedStatus)) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Invalid status transition from ${Object.keys(AIRDROP_STATUS).find((k) => AIRDROP_STATUS[k] === airdrop.status)} to ${Object.keys(AIRDROP_STATUS).find((k) => AIRDROP_STATUS[k] === parsedStatus)}`,
        );
      }

      const updateData = { status: parsedStatus };

      await airdrop.update(updateData);

      logger.info(`Airdrop ${id} updated: ${JSON.stringify(updateData)}`);

      return respond(res, httpStatus.OK, "Airdrop updated successfully", {
        airdrop: airdrop.toJSON(),
      });
    } catch (err) {
      logger.error("Error updating airdrop status:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  /**
   * Prepare airdrop funding transaction.
   * Creates a transaction for admin to sign to transfer tokens to the platform/airdrop wallet
   */
  static async prepareAirdropFunding(req, res) {
    try {
      const {
        totalAmount,
        rewardType,
        tokenAddress,
        fromAddress,
        tokenDecimals = 9,
      } = req.body;

      logger.info(
        `Preparing airdrop funding: amount=${totalAmount}, type=${rewardType}, from=${fromAddress}`,
      );

      if (!totalAmount || totalAmount <= 0) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Total amount is required and must be greater than 0",
        );
      }

      if (!fromAddress) {
        return respond(res, httpStatus.BAD_REQUEST, "fromAddress is required");
      }

      let type;
      let tokenMint;

      const numericType =
        typeof rewardType === "number" ? rewardType : parseInt(rewardType);

      switch (numericType) {
        case REWARD_TYPE.SOL:
          type = RAFFLE_REWARD_TYPES.SOLANA;
          tokenMint = SPL_TOKEN_ADDRESS.SOLANA;
          break;
        case REWARD_TYPE.SPL_TOKEN:
          type = RAFFLE_REWARD_TYPES.SPL_TOKEN;
          tokenMint = tokenAddress;
          break;
        case REWARD_TYPE.SPL_TOKEN_2022:
          type = RAFFLE_REWARD_TYPES.SPL_TOKEN_2022;
          tokenMint = tokenAddress;
          break;
        default:
          type = RAFFLE_REWARD_TYPES.SOLANA;
          tokenMint = SPL_TOKEN_ADDRESS.SOLANA;
      }

      if (!tokenMint && numericType !== REWARD_TYPE.SOL) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Token address is required for SPL token transfers",
        );
      }

      const splTokenSendSummary = [
        {
          tokenAddress: tokenMint,
          toAccount: AirdropWallet.getWalletAddress(),
          amount: parseFloat(totalAmount),
          type,
          decimals: tokenDecimals,
          metadata: { purpose: "airdrop_funding", rewardType: numericType },
        },
      ];

      const feeData = await getFeeData();

      const transferResponse = await sendMultipleSplTokenTx({
        splTokenSendSummary,
        solCommission: 0,
        feePayer: fromAddress,
        feeData,
        fromAccount: fromAddress,
        isUserToPlatform: true,
        transferDirection: TRANSFER_DIRECTION.ADMIN_TO_AIRDROP,
      });

      if (!transferResponse.success) {
        logger.error(
          `Failed to create funding transaction: ${transferResponse.message}`,
        );
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Failed to create funding transaction: ${transferResponse.message}`,
        );
      }

      return respond(
        res,
        httpStatus.OK,
        "Airdrop funding transaction prepared",
        {
          transaction: transferResponse.data.serializedTx,
          checksum: transferResponse.data.checksum,
          blockhash: transferResponse.data.blockhash,
          lastValidBlockHeight: transferResponse.data.lastValidBlockHeight,
          fundingData: {
            totalAmount: parseFloat(totalAmount),
            rewardType: numericType,
            tokenAddress: tokenMint,
            airdropWallet: AirdropWallet.getWalletAddress(),
          },
        },
      );
    } catch (err) {
      logger.error("Error in prepareAirdropFunding:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  /**
   * Confirm airdrop funding and create the campaign.
   * Per-user rewards are generated later when make-claimable is explicitly confirmed.
   */
  static async confirmAirdropFunding(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        airdropName,
        startDate,
        endDate,
        rewardType,
        tokenAddress,
        tokenSymbol,
        tokenDecimals,
        totalAmount,
        hasLeaderboardLimit,
        leaderboardLimit,
        signedTransaction,
        checksum,
        fromAddress,
      } = req.body;

      logger.info(
        `Confirming airdrop funding: amount=${totalAmount}`,
      );

      if (!signedTransaction || !checksum) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "signedTransaction and checksum are required",
        );
      }

      if (!totalAmount || parseFloat(totalAmount) <= 0) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "totalAmount must be greater than 0",
        );
      }

      if (!airdropName || !String(airdropName).trim()) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "airdropName is required");
      }

      if (!startDate || !endDate) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "startDate and endDate are required",
        );
      }

      const parsedStartDate = normalizeDateTimeInput(startDate, "start");
      const parsedEndDate = normalizeDateTimeInput(endDate, "end");

      if (
        Number.isNaN(parsedStartDate.getTime()) ||
        Number.isNaN(parsedEndDate.getTime())
      ) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Invalid startDate or endDate format",
        );
      }

      if (parsedStartDate > parsedEndDate) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "startDate cannot be after endDate",
        );
      }

      const numericType =
        typeof rewardType === "number" ? rewardType : parseInt(rewardType || 0);
      const adminUserId = req.payload?.id;

      if (!adminUserId) {
        await transaction.rollback();
        return respond(res, httpStatus.UNAUTHORIZED, "Admin not authenticated");
      }

      const adminUser = await User.findByPk(adminUserId, {
        attributes: ["id", "pubkey"],
        transaction,
      });

      if (!adminUser?.pubkey) {
        await transaction.rollback();
        return respond(res, httpStatus.NOT_FOUND, "Admin wallet not found");
      }

      if (fromAddress && fromAddress !== adminUser.pubkey) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "fromAddress must match the authenticated admin wallet",
        );
      }

      let decoded;
      try {
        decoded = decodeSignedTransaction(signedTransaction);
      } catch (decodeErr) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Invalid signed transaction format",
        );
      }

      const { tx, isVersioned } = decoded;

      if (!validateTransactionChecksum(tx, isVersioned, checksum)) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Transaction checksum validation failed. Transaction may have been tampered with.",
        );
      }

      const txFeePayer = isVersioned
        ? tx.message.staticAccountKeys[0]?.toBase58()
        : tx.feePayer?.toBase58();

      if (!txFeePayer || txFeePayer !== adminUser.pubkey) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Signed transaction fee payer does not match authenticated admin wallet",
        );
      }

      const derivedFundingSignature = getTransactionSignature(tx, isVersioned);

      const existingFundingTx = await SplTokenSendTransaction.findOne({
        where: { txId: derivedFundingSignature },
        transaction,
      });

      if (existingFundingTx) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Funding transaction already recorded",
        );
      }

      const airdropWalletAddress = AirdropWallet.getWalletAddress();
      const parsedTotalAmount = parseFloat(totalAmount);
      const shouldApplyLimit = Boolean(hasLeaderboardLimit);
      const parsedLeaderboardLimit = parseInt(leaderboardLimit, 10);

      if (
        shouldApplyLimit &&
        (Number.isNaN(parsedLeaderboardLimit) || parsedLeaderboardLimit < 1)
      ) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "leaderboardLimit must be greater than 0 when hasLeaderboardLimit is enabled",
        );
      }

      // Fetch complete token image from chain
      const tokenImageUrl = await getAirdropTokenImage({
        rewardType: numericType,
        tokenAddress,
      });

      let splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA;
      if (numericType === REWARD_TYPE.SPL_TOKEN)
        splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN;
      else if (numericType === REWARD_TYPE.SPL_TOKEN_2022)
        splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN_2022;

      // Submit and wait for on-chain confirmation before mutating DB.
      const submissionResult =
        await submitTransactionToBlockchain(signedTransaction);

      logger.info(
        `Funding submission result: success=${submissionResult.success}, signature=${submissionResult.signature}, note=${submissionResult.note || "none"}`,
      );

      if (!submissionResult.success) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Failed to submit funding transaction: ${submissionResult.error || submissionResult.message}`,
        );
      }

      const finalFundingSignature = submissionResult.signature;

      if (derivedFundingSignature !== finalFundingSignature) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Submitted signature does not match signed transaction payload",
        );
      }

      // Record the funding transaction
      // Calculate actual uiAmount in smallest units (with decimals applied) for on-chain verification
      const fundingUiAmount = Math.floor(
        parsedTotalAmount * Math.pow(10, tokenDecimals || 9),
      );

      const splTxRecord = await SplTokenSendTransaction.create(
        {
          senderPubkey: adminUser.pubkey,
          receiverPubkey: airdropWalletAddress,
          type: splType,
          txId: finalFundingSignature,
          tokenAddress: tokenAddress || null,
          decimals: tokenDecimals || 9,
          uiAmount: String(fundingUiAmount),
          status: SPL_TOKEN_SEND_TX_STATUS?.CONFIRMED || 2,
          additionalJson: { purpose: "airdrop_funding" },
        },
        { transaction },
      );

      // Create the airdrop reward campaign (starts as FUNDED, admin can make it claimable)
      const airdrop = await AirdropDetail.create(
        {
          airdropName: String(airdropName).trim(),
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          type: numericType,
          tokenAddress: tokenAddress || null,
          tokenDecimals: tokenDecimals || 9,
          tokenSymbol:
            tokenSymbol || (numericType === REWARD_TYPE.SOL ? "SOL" : null),
          imageUrl: tokenImageUrl,
          totalAmount: parsedTotalAmount,
          status: AIRDROP_STATUS.FUNDED,
          airdropWallet: airdropWalletAddress,
          splTokenSendTxId: splTxRecord.id,
          creatorUserId: adminUserId,
          activationConfig: {
            hasLeaderboardLimit: shouldApplyLimit,
            leaderboardLimit: shouldApplyLimit
              ? parsedLeaderboardLimit
              : null,
            distributionMethod: "xp_proportional_v1",
          },
        },
        { transaction },
      );

      logger.info(
        `Airdrop ${airdrop.id} funded. Rewards will be created at make-claimable time.`,
      );

      await transaction.commit();

      return respond(
        res,
        httpStatus.CREATED,
        "Airdrop created and funded successfully",
        {
          airdrop: {
            ...airdrop.toJSON(),
            totalReceivers: 0,
          },
          fundingSignature: finalFundingSignature,
          fundingTxRecordId: splTxRecord.id,
        },
      );
    } catch (err) {
      await transaction.rollback();
      logger.error("Error in confirmAirdropFunding:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  /**
   * Preview the make-claimable allocation plan without creating rows.
   */
  static async previewMakeAirdropClaimable(req, res) {
    try {
      const { id } = req.params;

      const airdrop = await AirdropDetail.findByPk(id);

      if (!airdrop) {
        return respond(res, httpStatus.NOT_FOUND, "Airdrop not found");
      }

      if (airdrop.status !== AIRDROP_STATUS.FUNDED) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Only funded airdrops can be made claimable",
        );
      }

      const existingRewardsCount = await UserAirdropReward.count({
        where: { airdropRewardId: airdrop.id },
      });

      if (existingRewardsCount > 0) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Rewards already generated for this airdrop",
        );
      }

      const plan = await getMakeClaimablePlan({ airdrop });

      return respond(res, httpStatus.OK, "Airdrop claimable plan preview", {
        airdropId: airdrop.id,
        airdropName: airdrop.airdropName,
        tokenSymbol: airdrop.tokenSymbol,
        imageUrl: airdrop.imageUrl || TOKEN_IMAGE_PLACEHOLDER,
        recipients: plan.recipients,
        totalReceivers: plan.recipients.length,
        totalAmount: plan.totalAmount,
      });
    } catch (err) {
      logger.error("Error previewing airdrop claimable plan:", err);

      if (err.message?.includes("endDate") || err.message?.includes("eligible") || err.message?.includes("total XP")) {
        return respond(res, httpStatus.BAD_REQUEST, err.message);
      }

      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  /**
   * Make a funded airdrop claimable.
   * Creates user_airdrop_rewards at activation time using the campaign date range.
   */
  static async makeAirdropClaimable(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;

      const airdrop = await AirdropDetail.findByPk(id, { transaction });

      if (!airdrop) {
        await transaction.rollback();
        return respond(res, httpStatus.NOT_FOUND, "Airdrop not found");
      }

      if (airdrop.status !== AIRDROP_STATUS.FUNDED) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Only funded airdrops can be made claimable",
        );
      }

      const existingRewardsCount = await UserAirdropReward.count({
        where: { airdropRewardId: airdrop.id },
        transaction,
      });

      if (existingRewardsCount > 0) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Rewards already generated for this airdrop",
        );
      }

      const plan = await getMakeClaimablePlan({ airdrop });

      const userRewardsData = plan.recipients.map((recipient) => ({
        status: USER_REWARD_STATUS.UNCLAIMED,
        airdropRewardId: airdrop.id,
        pubKey: recipient.pubKey,
        amount: recipient.amount,
        xp: recipient.xp,
        splTokenSendTxId: null,
      }));

      await UserAirdropReward.bulkCreate(userRewardsData, { transaction });

      await airdrop.update(
        {
          status: AIRDROP_STATUS.ACTIVE,
        },
        { transaction },
      );

      await transaction.commit();

      return respond(res, httpStatus.OK, "Airdrop is now claimable", {
        airdropId: airdrop.id,
        status: AIRDROP_STATUS.ACTIVE,
        totalReceivers: userRewardsData.length,
      });
    } catch (err) {
      await transaction.rollback();
      logger.error("Error making airdrop claimable:", err);

      if (err.message?.includes("endDate") || err.message?.includes("eligible") || err.message?.includes("total XP")) {
        return respond(res, httpStatus.BAD_REQUEST, err.message);
      }

      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  /**
   * Get unclaimed airdrop rewards for the authenticated user, matched by wallet pubKey
   */
  static async getUserUnclaimedRewards(req, res) {
    try {
      const userId = req.payload?.id;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      // Resolve user's wallet address from their user ID
      const user = await User.findByPk(userId, {
        attributes: ["id", "pubkey"],
      });

      if (!user?.pubkey) {
        return respond(res, httpStatus.NOT_FOUND, "User wallet not found");
      }

      const unclaimedRewards = await UserAirdropReward.findAll({
        where: {
          pubKey: user.pubkey,
          status: {
            [Op.in]: [USER_REWARD_STATUS.UNCLAIMED, USER_REWARD_STATUS.PENDING],
          },
        },
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: AirdropDetail,
            as: "airdropDetail",
            where: {
              status: AIRDROP_STATUS.ACTIVE,
            },
            attributes: [
              "id",
              "airdropName",
              "startDate",
              "endDate",
              "tokenSymbol",
              "tokenAddress",
              "imageUrl",
              "type",
            ],
          },
        ],
      });

      const enrichedRewards = unclaimedRewards.map((reward) => ({
        ...reward.toJSON(),
        airdropName: reward.airdropDetail?.airdropName || null,
        startDate: reward.airdropDetail?.startDate || null,
        endDate: reward.airdropDetail?.endDate || null,
        tokenSymbol: reward.airdropDetail?.tokenSymbol,
        tokenAddress: reward.airdropDetail?.tokenAddress,
        imageUrl:
          reward.airdropDetail?.imageUrl || TOKEN_IMAGE_PLACEHOLDER,
        rewardType: reward.airdropDetail?.type,
      }));

      const totalAmount = enrichedRewards.reduce(
        (sum, r) => sum + parseFloat(r.amount || 0),
        0,
      );

      return respond(
        res,
        httpStatus.OK,
        "Unclaimed rewards retrieved successfully",
        {
          rewards: enrichedRewards,
          totalUnclaimed: enrichedRewards.length,
          totalAmount,
        },
      );
    } catch (err) {
      logger.error("Error fetching unclaimed rewards:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  /**
   * Prepare airdrop claim transaction (server partially signs with airdrop wallet; user completes)
   */
  static async prepareAirdropClaim(req, res) {
    try {
      const { rewardId } = req.params;
      const userId = req.payload?.id;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      const user = await User.findByPk(userId, {
        attributes: ["id", "pubkey"],
      });

      if (!user?.pubkey) {
        return respond(res, httpStatus.NOT_FOUND, "User wallet not found");
      }

      const userWallet = user.pubkey;

      const reward = await UserAirdropReward.findOne({
        where: {
          id: parseInt(rewardId),
          pubKey: userWallet,
          status: USER_REWARD_STATUS.UNCLAIMED,
        },
        include: [{ model: AirdropDetail, as: "airdropDetail" }],
      });

      if (!reward) {
        return respond(
          res,
          httpStatus.NOT_FOUND,
          "Reward not found for authenticated user",
        );
      }

      const campaign = reward.airdropDetail;

      if (!campaign || campaign.status !== AIRDROP_STATUS.ACTIVE) {
        return respond(res, httpStatus.BAD_REQUEST, "Airdrop is not active");
      }

      const claimResult = await createAirdropClaimTransaction({
        reward: {
          tokenAddress: campaign.tokenAddress,
          amount: parseFloat(reward.amount),
          type: campaign.type,
        },
        toAccount: userWallet,
        feePayer: userWallet,
      });

      if (!claimResult.success) {
        logger.error(
          `Failed to create claim transaction: ${claimResult.message}`,
        );
        return respond(res, httpStatus.BAD_REQUEST, claimResult.message);
      }

      logger.info(
        `Prepared claim transaction for userReward ${rewardId}, wallet ${userWallet}`,
      );

      return respond(res, httpStatus.OK, "Claim transaction prepared", {
        transaction: claimResult.data.serializedTx,
        checksum: claimResult.data.checksum,
        blockhash: claimResult.data.blockhash,
        lastValidBlockHeight: claimResult.data.lastValidBlockHeight,
        rewardId: reward.id,
        amount: parseFloat(reward.amount),
        tokenSymbol: campaign.tokenSymbol,
        imageUrl: campaign.imageUrl || TOKEN_IMAGE_PLACEHOLDER,
      });
    } catch (err) {
      logger.error("Error preparing airdrop claim:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  /**
   * Confirm reward claim from user signed transaction.
   * Validates checksum and wallet ownership before on-chain submission.
   * Writes DB records only after confirmed on-chain transaction.
   */
  static async claimReward(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { rewardId } = req.params;
      const { signedTransaction, checksum } = req.body;
      const userId = req.payload?.id;

      if (!signedTransaction || !checksum) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "signedTransaction and checksum are required",
        );
      }

      if (!userId) {
        await transaction.rollback();
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      const user = await User.findByPk(userId, {
        attributes: ["id", "pubkey"],
        transaction,
      });

      if (!user?.pubkey) {
        await transaction.rollback();
        return respond(res, httpStatus.NOT_FOUND, "User wallet not found");
      }

      const userWallet = user.pubkey;

      let decoded;
      try {
        decoded = decodeSignedTransaction(signedTransaction);
      } catch (decodeErr) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Invalid signed transaction format",
        );
      }

      const { tx, isVersioned } = decoded;

      if (!validateTransactionChecksum(tx, isVersioned, checksum)) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Transaction checksum validation failed. Transaction may have been tampered with.",
        );
      }

      const txFeePayer = isVersioned
        ? tx.message.staticAccountKeys[0]?.toBase58()
        : tx.feePayer?.toBase58();

      if (!txFeePayer || txFeePayer !== userWallet) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Signed transaction fee payer does not match authenticated wallet",
        );
      }

      const derivedSignature = getTransactionSignature(tx, isVersioned);

      const existingClaimTx = await SplTokenSendTransaction.findOne({
        where: { txId: derivedSignature },
        transaction,
      });

      if (existingClaimTx) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Claim transaction already recorded",
        );
      }

      const reward = await UserAirdropReward.findOne({
        where: {
          id: parseInt(rewardId),
          pubKey: userWallet,
          status: USER_REWARD_STATUS.UNCLAIMED,
        },
        include: [{ model: AirdropDetail, as: "airdropDetail" }],
        transaction,
      });

      if (!reward) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.NOT_FOUND,
          "Reward not found for authenticated user or already claimed. Try Refreshing the page.",
        );
      }

      const campaign = reward.airdropDetail;

      if (!campaign || campaign.status !== AIRDROP_STATUS.ACTIVE) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "Airdrop is not active");
      }

      // Submit and wait for on-chain confirmation before mutating DB.
      const submissionResult =
        await submitTransactionToBlockchain(signedTransaction);
      let shouldStoreAsPending = false;

      logger.info(
        `Claim submission result: success=${submissionResult.success}, signature=${submissionResult.signature}, note=${submissionResult.note || "none"}`,
      );

      if (!submissionResult.success) {
        if (!submissionResult.signature) {
          await transaction.rollback();
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            `Failed to submit claim transaction: ${submissionResult.error || submissionResult.message}`,
          );
        }

        // Signature exists but submit helper returned unsuccessful. Recheck once after a short delay.
        await new Promise((resolve) => setTimeout(resolve, 1000));

        shouldStoreAsPending = true;

        try {
          const recheckConfirmation = await connection.confirmTransaction(
            submissionResult.signature,
            "confirmed",
          );

          // Only treat as immediate success when explicit confirmation is successful.
          if (recheckConfirmation?.value?.err === null) {
            shouldStoreAsPending = false;
          }
        } catch (confirmErr) {
          logger.warn(
            `Error rechecking airdrop claim confirmation for ${submissionResult.signature}. Keeping tx as PENDING for cron handling.`,
          );
        }
      }

      const finalSignature = submissionResult.signature;

      if (derivedSignature !== finalSignature) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Submitted signature does not match signed transaction payload",
        );
      }

      // Determine token type for the SPL TX record
      let splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA;
      if (campaign.type === REWARD_TYPE.SPL_TOKEN)
        splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN;
      else if (campaign.type === REWARD_TYPE.SPL_TOKEN_2022)
        splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN_2022;

      // Create the SPL TX record for the claim
      // Calculate actual uiAmount in smallest units (with decimals applied) for on-chain verification
      const claimUiAmount = Math.floor(
        parseFloat(reward.amount) * Math.pow(10, campaign.tokenDecimals || 9),
      );

      const splTxRecord = await SplTokenSendTransaction.create(
        {
          senderPubkey: campaign.airdropWallet,
          receiverPubkey: userWallet,
          type: splType,
          txId: finalSignature,
          tokenAddress: campaign.tokenAddress || null,
          decimals: campaign.tokenDecimals,
          uiAmount: String(claimUiAmount),
          status: shouldStoreAsPending
            ? SPL_TOKEN_SEND_TX_STATUS.PENDING
            : SPL_TOKEN_SEND_TX_STATUS.SUCCESS,
          rewardTransferType: "airdrop_claim",
          additionalJson: {
            purpose: "airdrop_claim",
            airdropRewardId: campaign.id,
          },
        },
        { transaction },
      );

      const nextRewardStatus = shouldStoreAsPending
        ? USER_REWARD_STATUS.PENDING
        : USER_REWARD_STATUS.CLAIMED;

      // Mark the user reward as claimed when confirmed, otherwise pending for cron verification.
      await reward.update(
        {
          status: nextRewardStatus,
          splTokenSendTxId: splTxRecord.id,
        },
        { transaction },
      );

      if (!shouldStoreAsPending) {
        // If all user rewards are claimed, mark the campaign as completed
        const pendingCount = await UserAirdropReward.count({
          where: {
            airdropRewardId: campaign.id,
            status: { [Op.ne]: USER_REWARD_STATUS.CLAIMED },
          },
          transaction,
        });

        if (pendingCount === 0) {
          await campaign.update(
            { status: AIRDROP_STATUS.COMPLETED },
            { transaction },
          );
        }
      }

      await transaction.commit();

      const responseMessage = shouldStoreAsPending
        ? "Transaction submitted and is pending confirmation"
        : "Reward claimed successfully";

      return respond(res, httpStatus.OK, responseMessage, {
        rewardId: reward.id,
        rewardStatus: nextRewardStatus,
        transactionSignature: finalSignature,
      });
    } catch (err) {
      await transaction.rollback();
      logger.error("Error claiming reward:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }
}

module.exports = AirdropController;
