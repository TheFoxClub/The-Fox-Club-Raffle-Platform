const {
  Raffle,
  RaffleDetail,
  RaffleReward,
  RaffleTicket,
  SplTokenSendTransaction,
  User,
  UserInfo,
  VerifiedCollection,
  VerifiedToken,
  SystemFee,
  Sequelize,
  sequelize,
} = require("../models");
const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");
const { Op, where } = require("sequelize");
const {
  TOKEN_TYPE,
  SPL_TOKEN_SEND_TX_STATUS,
  RAFFLE_STATUS,
  RAFFLE_FEATURED_STATUS,
  RAFFLE_FEATURED_POSITION,
  mapEnumValue,
  SPL_TOKEN_ADDRESS,
} = require("../config/data");
const {
  getTopHosts,
  getTopBuyers,
} = require("../services/leaderboard.service");
const redisClient = require("../util/redisClient");
const { LEADERBOARD_EXCLUDED_WALLETS } = require("../config/constants");
const { getFeeData } = require("../helpers/cache/system-fee");
const XpService = require("../services/xp.service");
const { publicKey } = require("@metaplex-foundation/umi");
const {
  fetchMetadataFromSeeds,
} = require("@metaplex-foundation/mpl-token-metadata");
const { getUmi } = require("../config/solana");
const { getTokenDetail } = require("../helpers/solana/token-program");
const PriceService = require("../services/price.service");
const {
  sendRaffleEndingSoonNotification,
} = require("../services/discord.service");

const VERIFIED_COLLECTION_MATCH_TYPES = {
  COLLECTION: "collection",
  CREATOR: "creator",
};

const isValidVerifiedCollectionMatchType = (value) =>
  Object.values(VERIFIED_COLLECTION_MATCH_TYPES).includes(value);

const clearVerifiedCollectionCaches = async () => {
  await Promise.all([
    redisClient.deleteByPattern("nfts:all:*"),
    redisClient.deleteByPattern("nfts:collection:*"),
  ]);
};

class AdminController {
  static async getAllRaffles(req, res) {
    try {
      const { status, page = 1, limit = 20, search } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = {
        status: {
          [Op.ne]: RAFFLE_STATUS.DRAFT,
        },
      };

      if (status) {
        const statusValue = parseInt(status);
        if (statusValue && statusValue !== RAFFLE_STATUS.DRAFT) {
          whereClause.status = statusValue;
        }
      }

      let finalWhereClause = whereClause;

      if (search && search.trim()) {
        const searchTerm = search.trim().toLowerCase(); // Convert to lowercase for consistency

        const titleSearchCondition = Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("raffle.title")),
          "LIKE",
          `%${searchTerm}%`
        );

        const userSearchCondition = Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("user.pubkey")),
          "LIKE",
          `%${searchTerm}%`
        );

        const searchCondition = {
          [Op.or]: [titleSearchCondition, userSearchCondition],
        };

        if (Object.keys(whereClause).length > 0) {
          finalWhereClause = {
            [Op.and]: [whereClause, searchCondition],
          };
        } else {
          finalWhereClause = searchCondition;
        }
      }

      const includeOptions = [
        {
          model: RaffleDetail,
        },
        {
          model: User,
          attributes: ["id", "pubkey"],
          required: false,
        },
      ];

      const { count, rows: raffles } = await Raffle.findAndCountAll({
        where: finalWhereClause,
        include: includeOptions,
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return respond(res, httpStatus.OK, "All raffles retrieved successfully", {
        raffles,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
        search: search || null,
      });
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async toggleFeaturedStatus(req, res) {
    try {
      const { id } = req.params;

      const { isFeatured, featuredPosition, featuredUntil } = req.body;

      const raffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      if (!raffle.raffle_detail) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle details not found");
      }

      raffle.raffle_detail.isFeatured = isFeatured
        ? RAFFLE_FEATURED_STATUS.FEATURED
        : RAFFLE_FEATURED_STATUS.NOT_FEATURED;
      if (featuredPosition !== undefined) {
        raffle.raffle_detail.featuredPosition = isFeatured
          ? RAFFLE_FEATURED_POSITION[featuredPosition]
          : null;
      }
      if (featuredUntil !== undefined) {
        raffle.raffle_detail.featuredUntil = isFeatured ? featuredUntil : null;
      }

      await raffle.raffle_detail.save();

      return respond(
        res,
        httpStatus.OK,
        "Featured status updated successfully",
        {
          raffle,
        }
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async toggleSuspendStatus(req, res) {
    try {
      const { id } = req.params;

      const { suspend } = req.body; // boolean: true to suspend, false to resume

      const raffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      const now = new Date();

      if (suspend) {
        raffle.status = RAFFLE_STATUS.SUSPENDED;
      } else if (raffle.startDate > now) {
        raffle.status = RAFFLE_STATUS.UPCOMING;
      } else if (raffle.endDate > now) {
        raffle.status = RAFFLE_STATUS.LIVE;
      } else {
        raffle.status = RAFFLE_STATUS.ENDED;
      }

      await raffle.save();

      const currentJson = raffle.RaffleDetail?.additionalJson || {};
      const updatedJson = {
        ...currentJson,
        suspended: suspend,
        suspendedAt: suspend ? new Date() : null,
      };

      if (raffle.raffle_detail) {
        raffle.raffle_detail.additionalJson = updatedJson;
        await raffle.raffle_detail.save();
      }

      return respond(
        res,
        httpStatus.OK,
        suspend
          ? "Raffle suspended successfully"
          : "Raffle resumed successfully",
        { raffle }
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async sendRaffleReminder(req, res) {
    try {
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
            required: false,
          },
          {
            model: RaffleReward,
            required: false,
          },
          {
            model: User,
            attributes: ["id", "pubkey"],
            required: false,
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      await sendRaffleEndingSoonNotification({
        raffle: raffle.get({ plain: true }),
        origin: req.headers.origin,
        creatorPubkey: raffle.User?.pubkey,
        force: true,
      });

      return respond(res, httpStatus.OK, "Raffle reminder sent", {
        raffleId: raffle.id,
      });
    } catch (err) {
      logger.error("Error sending manual raffle reminder:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async getAllVerifiedCollections(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: collections } =
        await VerifiedCollection.findAndCountAll({
          order: [["createdAt", "DESC"]],
          limit: parseInt(limit),
          offset: parseInt(offset),
        });

      return respond(
        res,
        httpStatus.OK,
        "Verified collections retrieved successfully",
        {
          collections,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
          },
        }
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async createVerifiedCollection(req, res) {
    try {
      const address = String(req.body.address || "").trim();
      const name = req.body.name ? String(req.body.name).trim() : null;
      const matchType = String(
        req.body.matchType || VERIFIED_COLLECTION_MATCH_TYPES.COLLECTION
      ).trim();

      if (!address) {
        return respond(res, httpStatus.BAD_REQUEST, "Address is required");
      }

      if (!isValidVerifiedCollectionMatchType(matchType)) {
        return respond(res, httpStatus.BAD_REQUEST, "Invalid match type");
      }

      const existingCollection = await VerifiedCollection.findOne({
        where: { address },
      });

      if (existingCollection) {
        return respond(
          res,
          httpStatus.CONFLICT,
          "Collection with this address already exists"
        );
      }

      const collection = await VerifiedCollection.create({
        address,
        name,
        matchType,
        isVerified: false,
      });

      await clearVerifiedCollectionCaches();

      return respond(
        res,
        httpStatus.CREATED,
        "Verified collection created successfully!",
        { collection }
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async updateVerifiedCollection(req, res) {
    try {
      const { id } = req.params;
      const address = req.body.address
        ? String(req.body.address).trim()
        : undefined;
      const name =
        req.body.name !== undefined ? String(req.body.name).trim() : undefined;
      const isVerified = req.body.isVerified;
      const matchType = req.body.matchType
        ? String(req.body.matchType).trim()
        : undefined;

      const collection = await VerifiedCollection.findByPk(id);

      if (!collection) {
        return respond(res, httpStatus.NOT_FOUND, "Collection not found");
      }

      if (
        matchType !== undefined &&
        !isValidVerifiedCollectionMatchType(matchType)
      ) {
        return respond(res, httpStatus.BAD_REQUEST, "Invalid match type");
      }

      // Check if address is being updated and if it already exists
      if (address && address !== collection.address) {
        const existingAddress = await VerifiedCollection.findOne({
          where: { address },
        });

        if (existingAddress) {
          return respond(
            res,
            httpStatus.CONFLICT,
            "Address already exists for another collection"
          );
        }
      }

      await collection.update({
        address: address || collection.address,
        name: name !== undefined ? name : collection.name,
        matchType: matchType || collection.matchType,
        isVerified:
          isVerified !== undefined ? isVerified : collection.isVerified,
      });

      await clearVerifiedCollectionCaches();

      return respond(res, httpStatus.OK, "Collection updated successfully", {
        collection,
      });
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async deleteVerifiedCollection(req, res) {
    try {
      const { id } = req.params;

      const collection = await VerifiedCollection.findByPk(id);

      if (!collection) {
        return respond(res, httpStatus.NOT_FOUND, "Collection not found");
      }

      await collection.destroy();

      await clearVerifiedCollectionCaches();
      logger.info("Deleted user NFT caches after deleting collection");

      return respond(res, httpStatus.OK, "Collection deleted successfully");
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async getVerifiedCollectionById(req, res) {
    try {
      const { id } = req.params;

      const collection = await VerifiedCollection.findByPk(id);

      if (!collection) {
        return respond(res, httpStatus.NOT_FOUND, "Collection not found");
      }

      return respond(res, httpStatus.OK, "Collection retrieved successfully", {
        collection,
      });
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async toggleVerification(req, res) {
    try {
      const { id } = req.params;

      const collection = await VerifiedCollection.findByPk(id);

      if (!collection) {
        return respond(res, httpStatus.NOT_FOUND, "Collection not found");
      }

      await collection.update({
        isVerified: !collection.isVerified,
      });

      await clearVerifiedCollectionCaches();
      logger.info("Deleted user NFT caches after updating collection status");

      return respond(
        res,
        httpStatus.OK,
        `Collection ${
          collection.isVerified ? "verified" : "unverified"
        } successfully`,
        { collection }
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async bulkUploadFromCSV(req, res) {
    try {
      if (!req.file) {
        return respond(res, httpStatus.BAD_REQUEST, "CSV file is required");
      }

      const csvData = req.file.buffer.toString();
      const rows = csvData.split("\n");
      const results = {
        success: [],
        failed: [],
        duplicates: [],
      };

      // Skip header row if it exists
      const startIndex = rows[0].toLowerCase().includes("address") ? 1 : 0;

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;

        const cleanValue = (value) => value.trim().replace(/^['"]|['"]$/g, "");

        const columns = row.split(",").map(cleanValue);

        const address = columns[0];
        const name = columns[1] || null;
        const matchType = (
          columns[2] || VERIFIED_COLLECTION_MATCH_TYPES.COLLECTION
        ).toLowerCase();

        if (!address) {
          results.failed.push({ row: i + 1, error: "Address is required" });
          continue;
        }

        if (!isValidVerifiedCollectionMatchType(matchType)) {
          results.failed.push({
            row: i + 1,
            address,
            error: `Invalid match type: ${matchType}`,
          });
          continue;
        }

        try {
          // Check if address already exists
          const existing = await VerifiedCollection.findOne({
            where: { address },
          });

          if (existing) {
            results.duplicates.push({ address, name });
            continue;
          }

          const collection = await VerifiedCollection.create({
            address,
            name,
            matchType,
            isVerified: false,
          });

          results.success.push(collection);
        } catch (error) {
          results.failed.push({ row: i + 1, address, error: error.message });
        }
      }

      await clearVerifiedCollectionCaches();

      return respond(res, httpStatus.OK, "CSV upload processed", { results });
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async bulkDeleteCollections(req, res) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return respond(res, httpStatus.BAD_REQUEST, "Array of IDs is required");
      }

      const deletedCount = await VerifiedCollection.destroy({
        where: { id: ids },
      });

      await clearVerifiedCollectionCaches();

      return respond(
        res,
        httpStatus.OK,
        `${deletedCount} collection(s) deleted successfully`
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async lookupCollectionByAddress(req, res) {
    try {
      const { address } = req.query;
      if (!address || address.trim().length < 32) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Valid collection address is required"
        );
      }
      const umi = getUmi();
      const asset = await umi.rpc.getAsset(publicKey(address.trim()));
      const name =
        asset?.content?.metadata?.name?.replace(/\0/g, "").trim() || null;
      
      logger.info(`Fetched collection name for ${address}: ${name}`);
      return respond(res, httpStatus.OK, "Collection metadata fetched", {
        name,
      });
    } catch (error) {
      // Address not found on-chain or invalid — return null name instead of error to allow manual entry
      logger.error(`No on-chain metadata found for collection ${address}`);
      return respond(res, httpStatus.OK, "No on-chain metadata found", {
        name: null,
      });
    }
  }

  static async getTopRaffleCreators(req, res) {
    try {
      // const creators = await Raffle.findAll({
      //   attributes: [
      //     "userId",
      //     [Sequelize.fn("SUM", Sequelize.col("totalRevenue")), "totalRevenue"],
      //   ],
      //   include: [
      //     {
      //       model: User,
      //       attributes: ["pubkey"],
      //       include: [
      //         {
      //           model: UserInfo,
      //           attributes: ["username", "photoUrl"],
      //         },
      //       ],
      //     },
      //   ],
      //   group: ["userId", "user.id", "user->user_info.id"],
      //   order: [[Sequelize.literal("totalRevenue"), "DESC"]],
      //   limit: 3,
      //   raw: false,
      // });

      // Get top creators by SOL revenue only (tokenType = 0)
      const creators = await sequelize.query(
        `
        SELECT 
          r.userId,
          u.pubkey as walletAddress,
          ui.username,
          ui.photoUrl,
          SUM(CASE WHEN r.tokenType = 0 THEN r.totalRevenue ELSE 0 END) as totalRevenue,
          0 as tokenType
        FROM raffles r
        LEFT JOIN users u ON r.userId = u.id
        LEFT JOIN user_infos ui ON u.id = ui.userId
        WHERE r.status != 0
        GROUP BY r.userId, u.pubkey, ui.username, ui.photoUrl
        HAVING totalRevenue > 0
        ORDER BY totalRevenue DESC
        LIMIT 3
        `,
        {
          type: sequelize.QueryTypes.SELECT,
        }
      );

      const ranked = creators.map((creator, index) => ({
        rank: index + 1,
        userId: creator.userId,
        walletAddress: creator.walletAddress,
        username: creator.username ?? null,
        photoUrl: creator.photoUrl ?? null,
        totalRevenue: Number(creator.totalRevenue || 0),
        tokenType: mapEnumValue(TOKEN_TYPE, creator.tokenType),
        tokenAddress: null,
      }));

      return respond(
        res,
        httpStatus.OK,
        "Top raffle creators fetched!",
        ranked
      );
    } catch (error) {
      console.error(error);
      logger.error("Error fetching top raffle creators");
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, "Server error", {
        error: error.message,
      });
    }
  }

  static async getDashboardStats(req, res) {
    try {
      const [liveRaffleCount, totalRafflesCreated] = await Promise.all([
        Raffle.count({
          where: { status: RAFFLE_STATUS.LIVE },
        }),
        Raffle.count(),
      ]);
      const ticketPayments = await SplTokenSendTransaction.findAll({
        where: {
          rewardTransferType: "ticket_purchase",
          status: SPL_TOKEN_SEND_TX_STATUS.SUCCESS,
        },
        attributes: [
          "id",
          "type",
          "tokenAddress",
          "decimals",
          "uiAmount",
          "commissionAmount",
          "additionalJson",
        ],
        raw: true,
      });
      const successfulTicketTransactionIds = ticketPayments.map((payment) =>
        String(payment.id),
      );
      const totalTicketsSold = successfulTicketTransactionIds.length
        ? await RaffleTicket.count({
          where: {
            splTokenSendTxId: { [Op.in]: successfulTicketTransactionIds },
          },
        })
        : 0;

      let totalRevenueUsd = 0;
      let totalPlatformRevenueUsd = 0;
      const statsByToken = {};

      for (const payment of ticketPayments) {
        const decimals = Number(payment.decimals) || 9;
        const tokenPrice = await PriceService.getTokenUsdPrice(payment.tokenAddress);
        const totalAmount = Number(payment.uiAmount || 0) / Math.pow(10, decimals);
        const commissionAmount = Number(payment.commissionAmount || 0);
        const totalUsd = totalAmount * tokenPrice;
        const commissionUsd = commissionAmount * tokenPrice;
        const key = `${payment.type}:${payment.tokenAddress}`;

        totalRevenueUsd += totalUsd;
        totalPlatformRevenueUsd += commissionUsd;

        if (!statsByToken[key]) {
          statsByToken[key] = {
            tokenType: mapEnumValue(TOKEN_TYPE, payment.type),
            tokenTypeRaw: payment.type,
            tokenAddress: payment.tokenAddress,
            totalRevenue: 0,
            totalTicketsSold: 0,
            totalPlatformRevenue: 0,
          };
        }

        statsByToken[key].totalRevenue += totalUsd;
        statsByToken[key].totalPlatformRevenue += commissionUsd;
        statsByToken[key].totalTicketsSold += Number(payment.additionalJson?.ticketCount || 1);
      }

      const statsByTokenArray = Object.values(statsByToken);

      const response = {
        totalRevenue: totalRevenueUsd,
        totalTicketsSold,
        totalPlatformRevenue: totalPlatformRevenueUsd,
        liveRaffleCount,
        totalRafflesCreated,
        currency: "USD",
        statsByToken: statsByTokenArray,
      };

      return respond(res, httpStatus.OK, "Dashboard stats fetched!", response);
    } catch (error) {
      console.error(error);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, "Server error", {
        error: error.message,
      });
    }
  }

  static async getTopPerformingRaffles(req, res) {
    try {
      const { limit = 3 } = req.query;

      const queryResult = await sequelize.query(
        `
        SELECT 
          r.id,
          r.title,
          r.ticketPrice,
          r.status,
          r.tokenType,
          r.tokenAddress,
          u.pubkey as creatorAddress,
          COALESCE(
            (
              SELECT COUNT(*) * r.ticketPrice
              FROM raffle_tickets rt
              WHERE rt.raffleId = r.id
              AND rt.splTokenSendTxId IS NOT NULL
            ), 0
          ) as revenue,
          COALESCE(
            (
              SELECT COUNT(*)
              FROM raffle_tickets rt
              WHERE rt.raffleId = r.id
              AND rt.splTokenSendTxId IS NOT NULL
            ), 0
          ) as totalTicketsSold
        FROM raffles r
        LEFT JOIN users u ON r.userId = u.id
        WHERE r.status <> 0
        ORDER BY revenue DESC
        LIMIT ?
        `,
        {
          replacements: [parseInt(limit, 10)],
        }
      );

      const raffles = queryResult[0] || [];

      const formattedRaffles = raffles.map((raffle, index) => ({
        rank: index + 1,
        raffleId: raffle.id,
        raffleName: raffle.title,
        creatorAddress: raffle.creatorAddress,
        revenue: parseFloat(raffle.revenue || 0),
        totalTicketsSold: parseInt(raffle.totalTicketsSold || 0, 10),
        status: mapEnumValue(RAFFLE_STATUS, raffle.status),
        ticketPrice: parseFloat(raffle.ticketPrice || 0),
        tokenType: mapEnumValue(TOKEN_TYPE, raffle.tokenType),
        tokenTypeRaw: raffle.tokenType,
        tokenAddress: raffle.tokenAddress,
      }));

      return respond(
        res,
        httpStatus.OK,
        "Top performing raffles fetched!",
        formattedRaffles
      );
    } catch (error) {
      logger.error("Error getting top performing raffles:", error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to retrieve top performing raffles"
      );
    }
  }

  static async getTopHostsAndBuyers(req, res) {
    try {
      const { limit = 10 } = req.query;
      const xpConfig = await XpService.getXpRates();

      const topHosts = await getTopHosts(limit, xpConfig);

      const topBuyers = await getTopBuyers(limit, xpConfig);

      return respond(res, httpStatus.OK, "Top hosts and buyers fetched!", {
        topHosts,
        topBuyers,
        xpConfig,
      });
    } catch (error) {
      logger.error("Error getting top hosts and buyers:", error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to fetch top hosts and buyers"
      );
    }
  }

  // ---------Verified Token APIs-------------
  static async getAllTokens(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: tokens } = await VerifiedToken.findAndCountAll({
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return respond(
        res,
        httpStatus.OK,
        "Verified tokens retrieved successfully",
        {
          tokens,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
          },
        }
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  // Get all verified tokens(only verified)
  static async getAllVerifiedTokens(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: tokens } = await VerifiedToken.findAndCountAll({
        where: { isVerified: true },
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return respond(
        res,
        httpStatus.OK,
        "Verified tokens retrieved successfully",
        {
          tokens,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
          },
        }
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async createVerifiedToken(req, res) {
    try {
      const { address, name, decimals, symbol, programId } = req.body;

      if (!address) {
        return respond(res, httpStatus.BAD_REQUEST, "Address is required");
      }

      if (address === SPL_TOKEN_ADDRESS.SOLANA) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Solana is a built-in token and cannot be added manually"
        );
      }

      const existingToken = await VerifiedToken.findOne({
        where: { address },
      });

      if (existingToken) {
        return respond(
          res,
          httpStatus.CONFLICT,
          "Token with this address already exists"
        );
      }

      let tokenType = TOKEN_TYPE.SPL_TOKEN;
      let finalProgramId = programId;

      if (programId === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
        tokenType = TOKEN_TYPE.SPL_TOKEN_2022;
        finalProgramId = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
      } else {
        tokenType = TOKEN_TYPE.SPL_TOKEN;
        finalProgramId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
      }

      let finalSymbol = symbol || name || null;
      if (finalSymbol && finalSymbol.length > 10) {
        logger.info(
          `Token symbol truncated from "${finalSymbol}" to "${finalSymbol.substring(
            0,
            10
          )}" for address ${address}`
        );
        finalSymbol = finalSymbol.substring(0, 10);
      }

      const token = await VerifiedToken.create({
        address,
        name: name || null,
        symbol: finalSymbol,
        decimals: decimals || 0,
        tokenType,
        programId: finalProgramId,
        isVerified: false,
        isPaymentToken: false,
      });

      return respond(
        res,
        httpStatus.CREATED,
        "Verified token created successfully!",
        { token }
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async inspectTokenMint(req, res) {
    try {
      const { mint } = req.params;
      const tokenDetail = await getTokenDetail(mint);

      if (!tokenDetail) {
        return respond(res, httpStatus.NOT_FOUND, "Token mint was not found");
      }

      let metadata = null;
      try {
        metadata = await fetchMetadataFromSeeds(getUmi(), {
          mint: publicKey(mint),
        });
      } catch (error) {
        logger.debug(`Token metadata was not found for ${mint}: ${error.message}`);
      }

      return respond(res, httpStatus.OK, "Token mint retrieved successfully", {
        token: {
          mint,
          name: metadata?.name?.trim() || null,
          symbol: metadata?.symbol?.trim() || null,
          decimals: Number(tokenDetail.decimals || 0),
          programId: tokenDetail.tokenProgramId.toString(),
        },
      });
    } catch (error) {
      const statusCode = error.message?.includes("Invalid public key")
        ? httpStatus.BAD_REQUEST
        : httpStatus.INTERNAL_SERVER_ERROR;
      logger.error(`Failed to inspect token mint: ${error.message}`);
      return respond(res, statusCode, "Failed to retrieve token mint details");
    }
  }

  static async deleteVerifiedToken(req, res) {
    try {
      const { id } = req.params;

      const token = await VerifiedToken.findByPk(id);

      if (!token) {
        return respond(res, httpStatus.NOT_FOUND, "Token not found");
      }

      if (token.address === SPL_TOKEN_ADDRESS.SOLANA) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Solana is a built-in token and cannot be deleted"
        );
      }

      await token.destroy();

      return respond(res, httpStatus.OK, "Token deleted successfully");
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async getVerifiedTokenById(req, res) {
    try {
      const { id } = req.params;

      const token = await VerifiedToken.findByPk(id);

      if (!token) {
        return respond(res, httpStatus.NOT_FOUND, "Token not found");
      }

      return respond(res, httpStatus.OK, "Token retrieved successfully", {
        token,
      });
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async toggleTokenVerification(req, res) {
    try {
      const { id } = req.params;

      const token = await VerifiedToken.findByPk(id);

      if (!token) {
        return respond(res, httpStatus.NOT_FOUND, "Token not found");
      }

      if (token.address === SPL_TOKEN_ADDRESS.SOLANA) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Solana is a built-in token and cannot be modified"
        );
      }

      await token.update({
        isVerified: !token.isVerified,
      });

      return respond(
        res,
        httpStatus.OK,
        `Token ${token.isVerified ? "verified" : "unverified"} successfully`,
        { token }
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async togglePaymentToken(req, res) {
    try {
      const { id } = req.params;

      const token = await VerifiedToken.findByPk(id);

      if (!token) {
        return respond(res, httpStatus.NOT_FOUND, "Token not found");
      }

      if (token.address === SPL_TOKEN_ADDRESS.SOLANA) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Solana is a built-in token and cannot be modified"
        );
      }

      if (!token.isVerified && !token.isPaymentToken) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Token must be verified before it can be enabled for payments"
        );
      }

      await token.update({
        isPaymentToken: !token.isPaymentToken,
      });
      if (!token.isPaymentToken && token.isFeatured) {
        await token.update({ isFeatured: false });
      }
      await redisClient.del("verified:payment:tokens");

      return respond(
        res,
        httpStatus.OK,
        `Token ${
          token.isPaymentToken ? "enabled" : "disabled"
        } for payments successfully`,
        { token }
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error)
      );
    }
  }

  static async toggleTokenFeatured(req, res) {
    try {
      const { id } = req.params;
      const token = await VerifiedToken.findByPk(id);

      if (!token) {
        return respond(res, httpStatus.NOT_FOUND, "Token not found");
      }

      if (!token.isVerified || !token.isPaymentToken) {
        return respond(res, httpStatus.BAD_REQUEST, "Token must be verified and enabled for payments first");
      }

      await token.update({ isFeatured: !token.isFeatured });
      await redisClient.del("verified:payment:tokens");

      return respond(
        res,
        httpStatus.OK,
        `Token ${token.isFeatured ? "featured" : "unfeatured"} successfully`,
        { token },
      );
    } catch (error) {
      logger.error(error);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, parseSequelizeErrors(error));
    }
  }

  // XP Management Methods
  static async getXpConfig(req, res) {
    try {
      const { XpConfig } = require("../models");

      const config = await XpConfig.findAll({
        where: { isActive: true },
        order: [["configKey", "ASC"]],
      });

      return respond(
        res,
        httpStatus.OK,
        "XP configuration retrieved successfully",
        {
          config,
        }
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async updateXpConfig(req, res) {
    try {
      const { configKey, configValue, description } = req.body;
      const { XpConfig } = require("../models");

      if (!configKey || configValue === undefined) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Config key and value are required"
        );
      }

      if (configValue < 0) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Config value cannot be negative"
        );
      }

      const [config, created] = await XpConfig.findOrCreate({
        where: { configKey },
        defaults: {
          configKey,
          configValue,
          description: description || null,
          isActive: true,
        },
      });

      if (!created) {
        await config.update({
          configValue,
          description:
            description !== undefined ? description : config.description,
          updatedAt: new Date(),
        });
      }

      // Clear XP rates cache
      const redisClient = require("../util/redisClient");
      await redisClient.del("xp:rates");

      return respond(
        res,
        httpStatus.OK,
        "XP configuration updated successfully",
        {
          config,
        }
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  //  Get XP leaderboard
  static async getXpLeaderboard(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: users } = await User.findAndCountAll({
        attributes: ["id", "pubkey", "totalXp", "xpLastUpdated"],
        where: {
          totalXp: { [Op.gt]: 0 },
          pubkey: { [Op.notIn]: LEADERBOARD_EXCLUDED_WALLETS },
        },
        order: [["totalXp", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: UserInfo,
            attributes: ["username", "email"],
            required: false,
          },
        ],
      });

      return respond(
        res,
        httpStatus.OK,
        "XP leaderboard retrieved successfully",
        {
          users,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
          },
        }
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  // Get XP analytics and statistics
  static async getXpAnalytics(req, res) {
    try {
      const { XpTable, XpConfig } = require("../models");

      // XP breakdown by config type
      const sourceBreakdown = await XpTable.findAll({
        include: [
          {
            model: XpConfig,
            as: "config",
            attributes: ["configKey", "description"],
            required: false,
          },
        ],
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("XpTable.id")), "recordCount"],
          [sequelize.fn("SUM", sequelize.col("xpEarned")), "totalXp"],
          [sequelize.fn("SUM", sequelize.col("usdValue")), "totalUsdValue"],
          [sequelize.fn("AVG", sequelize.col("xpEarned")), "avgXpPerRecord"],
        ],
        group: ["config.id"],
        raw: false,
      });

      const totalStats = await XpTable.findOne({
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "totalRecords"],
          [sequelize.fn("SUM", sequelize.col("xpEarned")), "totalXpAwarded"],
          [sequelize.fn("SUM", sequelize.col("usdValue")), "totalUsdProcessed"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.fn("DISTINCT", sequelize.col("userId"))
            ),
            "uniqueUsers",
          ],
        ],
        raw: true,
      });

      // Recent XP activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentActivity = await XpTable.findAll({
        attributes: [
          [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
          [sequelize.fn("COUNT", sequelize.col("id")), "recordCount"],
          [sequelize.fn("SUM", sequelize.col("xpEarned")), "dailyXp"],
        ],
        where: {
          createdAt: { [Op.gte]: sevenDaysAgo },
        },
        group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
        order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "DESC"]],
        raw: true,
      });

      // Top XP earners this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const topEarnersThisMonth = await XpTable.findAll({
        attributes: [
          "userId",
          [sequelize.fn("SUM", sequelize.col("xpEarned")), "monthlyXp"],
        ],
        where: {
          createdAt: { [Op.gte]: monthStart },
        },
        group: ["userId"],
        order: [[sequelize.fn("SUM", sequelize.col("xpEarned")), "DESC"]],
        limit: 10,
        raw: true,
      });

      // Get user details for top earners separately to avoid GROUP BY issues
      const topEarnersWithDetails = await Promise.all(
        topEarnersThisMonth.map(async (earner) => {
          const user = await User.findByPk(earner.userId, {
            attributes: ["pubkey"],
            include: [
              {
                model: UserInfo,
                attributes: ["username"],
                required: false,
              },
            ],
          });

          return {
            userId: earner.userId,
            monthlyXp: parseFloat(earner.monthlyXp || 0),
            user: user
              ? {
                  pubkey: user.pubkey,
                  user_info: user.user_info,
                }
              : null,
          };
        })
      );

      return respond(
        res,
        httpStatus.OK,
        "XP analytics retrieved successfully",
        {
          sourceBreakdown: sourceBreakdown.map((item) => ({
            configKey: item.config?.configKey,
            description: item.config?.description,
            recordCount: parseInt(item.dataValues.recordCount),
            totalXp: parseFloat(item.dataValues.totalXp || 0),
            totalUsdValue: parseFloat(item.dataValues.totalUsdValue || 0),
            avgXpPerRecord: parseFloat(item.dataValues.avgXpPerRecord || 0),
          })),
          totalStats: {
            totalRecords: parseInt(totalStats.totalRecords),
            totalXpAwarded: parseFloat(totalStats.totalXpAwarded || 0),
            totalUsdProcessed: parseFloat(totalStats.totalUsdProcessed || 0),
            uniqueUsers: parseInt(totalStats.uniqueUsers),
          },
          recentActivity: recentActivity.map((item) => ({
            date: item.date,
            recordCount: parseInt(item.recordCount),
            dailyXp: parseFloat(item.dailyXp || 0),
          })),
          topEarnersThisMonth: topEarnersWithDetails,
        }
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  //  Get XP processing status
  static async getXpProcessingStatus(req, res) {
    try {
      const XpProcessor = require("../services/xp-processor");
      const stats = await XpProcessor.getProcessingStats();

      return respond(
        res,
        httpStatus.OK,
        "XP processing status retrieved successfully",
        {
          stats,
        }
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async getXpRecords(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        configKey,
        userId,
        startDate,
        endDate,
      } = req.query;
      const offset = (page - 1) * limit;
      const { XpTable, XpConfig } = require("../models");

      let whereClause = {};
      let includeClause = [
        {
          model: XpConfig,
          as: "config",
          attributes: ["configKey", "description"],
        },
      ];

      if (configKey) {
        includeClause[0].where = { configKey };
      }

      if (userId) {
        whereClause.userId = parseInt(userId);
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = new Date(endDate);
        }
      }

      const { count, rows: records } = await XpTable.findAndCountAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          ...includeClause,
          {
            model: User,
            as: "user",
            attributes: ["pubkey"],
            include: [
              {
                model: UserInfo,
                attributes: ["username"],
                required: false,
              },
            ],
          },
          {
            model: Raffle,
            as: "raffle",
            attributes: ["title"],
            required: false,
          },
        ],
      });

      return respond(res, httpStatus.OK, "XP records retrieved successfully", {
        records,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  //  Manually trigger XP recalculation for a user
  static async recalculateUserXp(req, res) {
    try {
      const { userId } = req.params;
      const XpService = require("../services/xp.service");

      if (!userId) {
        return respond(res, httpStatus.BAD_REQUEST, "User ID is required");
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return respond(res, httpStatus.NOT_FOUND, "User not found");
      }

      await XpService.updateUserTotalXp(parseInt(userId));

      const updatedUser = await User.findByPk(userId, {
        attributes: ["id", "pubkey", "totalXp", "xpLastUpdated"],
      });

      return respond(res, httpStatus.OK, "User XP recalculated successfully", {
        user: updatedUser,
      });
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async getSystemFees(req, res) {
    try {
      const feeData = await getFeeData();
      return respond(res, httpStatus.OK, "success", feeData);
    } catch (err) {
      logger.error("Error in getSystemFees: ", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async updateSystemFees(req, res) {
    try {
      const feeData = req.body;
      await SystemFee.update(feeData, {
        where: {
          id: 1,
        },
      });
      const cacheKey = "systemFee:id:1";
      await redisClient.del(cacheKey);
      logger.info("Redis cache cleaned for System Fee");
      return respond(res, httpStatus.OK, "success");
    } catch (err) {
      logger.error("Error in updateSystemFees: ", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }
}

module.exports = AdminController;
