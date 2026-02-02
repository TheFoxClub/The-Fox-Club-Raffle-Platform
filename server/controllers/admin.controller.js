const {
  Raffle,
  RaffleDetail,
  User,
  UserInfo,
  VerifiedCollection,
  VerifiedToken,
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
  RAFFLE_STATUS,
  RAFFLE_FEATURED_STATUS,
  RAFFLE_FEATURED_POSITION,
  mapEnumValue,
} = require("../config/data");
const {
  getTopHosts,
  getTopBuyers,
} = require("../services/leaderboard.service");

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
          `%${searchTerm}%`,
        );

        const userSearchCondition = Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("user.pubkey")),
          "LIKE",
          `%${searchTerm}%`,
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
        parseSequelizeErrors(err),
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
        },
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
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

      console.log("raffle data: ", raffle);

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
        { raffle },
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
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
        },
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  static async createVerifiedCollection(req, res) {
    try {
      const { address, name } = req.body;

      if (!address) {
        return respond(res, httpStatus.BAD_REQUEST, "Address is required");
      }

      const existingCollection = await VerifiedCollection.findOne({
        where: { address },
      });

      if (existingCollection) {
        return respond(
          res,
          httpStatus.CONFLICT,
          "Collection with this address already exists",
        );
      }

      const collection = await VerifiedCollection.create({
        address,
        name: name || null,
        isVerified: false,
      });

      return respond(
        res,
        httpStatus.CREATED,
        "Verified collection created successfully!",
        { collection },
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error),
      );
    }
  }

  static async updateVerifiedCollection(req, res) {
    try {
      const { id } = req.params;
      const { address, name, isVerified } = req.body;

      const collection = await VerifiedCollection.findByPk(id);

      if (!collection) {
        return respond(res, httpStatus.NOT_FOUND, "Collection not found");
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
            "Address already exists for another collection",
          );
        }
      }

      await collection.update({
        address: address || collection.address,
        name: name !== undefined ? name : collection.name,
        isVerified:
          isVerified !== undefined ? isVerified : collection.isVerified,
      });

      return respond(res, httpStatus.OK, "Collection updated successfully", {
        collection,
      });
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error),
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

      return respond(res, httpStatus.OK, "Collection deleted successfully");
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error),
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
        parseSequelizeErrors(error),
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

      return respond(
        res,
        httpStatus.OK,
        `Collection ${
          collection.isVerified ? "verified" : "unverified"
        } successfully`,
        { collection },
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error),
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

        const columns = row.split(",").map((col) => col.trim());
        const address = columns[0];
        const name = columns[1] || null;

        if (!address) {
          results.failed.push({ row: i + 1, error: "Address is required" });
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
            isVerified: false,
          });

          results.success.push(collection);
        } catch (error) {
          results.failed.push({ row: i + 1, address, error: error.message });
        }
      }

      return respond(res, httpStatus.OK, "CSV upload processed", { results });
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error),
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

      return respond(
        res,
        httpStatus.OK,
        `${deletedCount} collection(s) deleted successfully`,
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error),
      );
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
        },
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
        ranked,
      );
    } catch (error) {
      console.error(error);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, "Server error", {
        error: error.message,
      });
    }
  }

  static async getDashboardStats(req, res) {
    try {
      // const stats = await Raffle.findOne({
      //   attributes: [
      //     [Sequelize.fn("SUM", Sequelize.col("totalRevenue")), "totalRevenue"],
      //     [
      //       Sequelize.fn("SUM", Sequelize.col("ticketsSold")),
      //       "totalTicketsSold",
      //     ],
      //     [
      //       Sequelize.fn("SUM", Sequelize.col("platformRevenue")),
      //       "totalPlatformRevenue",
      //     ],
      //   ],
      //   raw: true,
      // });
      // Get stats grouped by token type from raffles table
      const tokenStats = await sequelize.query(
        `
        SELECT 
          r.tokenType,
          SUM(COALESCE(r.totalRevenue, 0)) as totalRevenue,
          SUM(COALESCE(r.ticketsSold, 0)) as totalTicketsSold,
          SUM(COALESCE(r.platformRevenue, 0)) as totalPlatformRevenue
        FROM raffles r
        WHERE r.status != ?
        GROUP BY r.tokenType
        ORDER BY totalRevenue DESC
        `,
        {
          replacements: [0], // Exclude DRAFT raffles
          type: sequelize.QueryTypes.SELECT,
        },
      );

      const liveRaffleCount = await Raffle.count({
        where: {
          status: RAFFLE_STATUS.LIVE,
        },
      });

      const statsByToken = tokenStats.map((stat) => ({
        tokenType: mapEnumValue(TOKEN_TYPE, stat.tokenType),
        tokenTypeRaw: stat.tokenType,
        totalRevenue: Number(stat.totalRevenue || 0),
        totalTicketsSold: Number(stat.totalTicketsSold || 0),
        totalPlatformRevenue: Number(stat.totalPlatformRevenue || 0),
      }));

      // Calculate totals across all token types
      const totals = tokenStats.reduce(
        (acc, stat) => ({
          totalRevenue: acc.totalRevenue + Number(stat.totalRevenue || 0),
          totalTicketsSold:
            acc.totalTicketsSold + Number(stat.totalTicketsSold || 0),
          totalPlatformRevenue:
            acc.totalPlatformRevenue + Number(stat.totalPlatformRevenue || 0),
        }),
        { totalRevenue: 0, totalTicketsSold: 0, totalPlatformRevenue: 0 },
      );

      // Get SOL-only stats (tokenType = 0)
      const solStats = tokenStats.find((s) => s.tokenType === 0) || {
        tokenType: 0,
        totalRevenue: 0,
        totalTicketsSold: 0,
        totalPlatformRevenue: 0,
      };

      const response = {
        // Legacy totals (mixed tokens)
        totalRevenue: totals.totalRevenue,
        totalTicketsSold: totals.totalTicketsSold,
        totalPlatformRevenue: totals.totalPlatformRevenue,
        liveRaffleCount,
        // breakdown by token type
        statsByToken,
        // SOL-only stats for clean display
        primaryTokenStats: {
          tokenType: mapEnumValue(TOKEN_TYPE, solStats.tokenType),
          tokenTypeRaw: solStats.tokenType,
          totalRevenue: Number(solStats.totalRevenue || 0),
          totalTicketsSold: Number(solStats.totalTicketsSold || 0),
          totalPlatformRevenue: Number(solStats.totalPlatformRevenue || 0),
        },
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
        },
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
        formattedRaffles,
      );
    } catch (error) {
      logger.error("Error getting top performing raffles:", error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to retrieve top performing raffles",
      );
    }
  }

  static async getTopHostsAndBuyers(req, res) {
    try {
      const { limit = 10 } = req.query;

      const topHosts = await getTopHosts(limit);

      const topBuyers = await getTopBuyers(limit);

      return respond(res, httpStatus.OK, "Top hosts and buyers fetched!", {
        topHosts,
        topBuyers,
      });
    } catch (error) {
      logger.error("Error getting top hosts and buyers:", error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to fetch top hosts and buyers",
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
        },
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
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
        },
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err),
      );
    }
  }

  static async createVerifiedToken(req, res) {
    try {
      const { address, name, decimals } = req.body;

      if (!address) {
        return respond(res, httpStatus.BAD_REQUEST, "Address is required");
      }

      const existingToken = await VerifiedToken.findOne({
        where: { address },
      });

      if (existingToken) {
        return respond(
          res,
          httpStatus.CONFLICT,
          "Token with this address already exists",
        );
      }

      const token = await VerifiedToken.create({
        address,
        name: name || null,
        decimals,
        isVerified: false,
      });

      return respond(
        res,
        httpStatus.CREATED,
        "Verified token created successfully!",
        { token },
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error),
      );
    }
  }

  static async deleteVerifiedToken(req, res) {
    try {
      const { id } = req.params;

      const token = await VerifiedToken.findByPk(id);

      if (!token) {
        return respond(res, httpStatus.NOT_FOUND, "Token not found");
      }

      await token.destroy();

      return respond(res, httpStatus.OK, "Token deleted successfully");
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error),
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
        parseSequelizeErrors(error),
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

      await token.update({
        isVerified: !token.isVerified,
      });

      return respond(
        res,
        httpStatus.OK,
        `Token ${token.isVerified ? "verified" : "unverified"} successfully`,
        { token },
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error),
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

      if (!token.isVerified && !token.isPaymentToken) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Token must be verified before it can be enabled for payments",
        );
      }

      await token.update({
        isPaymentToken: !token.isPaymentToken,
      });

      return respond(
        res,
        httpStatus.OK,
        `Token ${token.isPaymentToken ? "enabled" : "disabled"} for payments successfully`,
        { token },
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(error),
      );
    }
  }
}

module.exports = AdminController;
