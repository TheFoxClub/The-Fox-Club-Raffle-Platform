const {
  Raffle,
  RaffleDetail,
  User,
  UserInfo,
  VerifiedCollection,
  Sequelize,
} = require("../models");
const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");
const { Op } = require("sequelize");
const {
  TOKEN_TYPE,
  RAFFLE_STATUS,
  RAFFLE_FEATURED_STATUS,
  RAFFLE_FEATURED_POSITION,
} = require("../config/data");

class AdminController {
  static async getAllRaffles(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = {};
      const now = new Date();

      if (status === RAFFLE_STATUS.LIVE) {
        whereClause = {
          startDate: { [Op.lte]: now },
          endDate: { [Op.gte]: now },
          endedAt: null,
        };
      } else if (status === RAFFLE_STATUS.ENDED) {
        whereClause = {
          [Op.or]: [
            { endDate: { [Op.lt]: now } },
            { endedAt: { [Op.not]: null } },
          ],
        };
      } else if (status === RAFFLE_STATUS.UPCOMING) {
        whereClause = {
          startDate: { [Op.gt]: now },
        };
      }

      const { count, rows: raffles } = await Raffle.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: RaffleDetail,
          },
          {
            model: User,
            attributes: ["id", "pubkey"],
          },
        ],
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

  static async createOrUpdateVerifiedCollection(req, res) {
    try {
      const { address, addresses } = req.body;
      let records = [];

      if (address) {
        const [record, created] = await VerifiedCollection.findOrCreate({
          where: { address },
          defaults: { address },
        });
        if (!created) {
          await record.update({ address });
        }
        records.push(record);
      }

      if (Array.isArray(addresses) && addresses.length > 0) {
        for (const addr of addresses) {
          const [record, created] = await VerifiedCollection.findOrCreate({
            where: { address: addr },
            defaults: { address: addr },
          });
          if (!created) {
            await record.update({ address: addr });
          }
          records.push(record);
        }
      }

      return respond(
        res,
        httpStatus.OK,
        "Verified collection(s) created/updated successfully!",
        { data: records }
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

  static async getTopRaffleCreators(req, res) {
    try {
      const creators = await Raffle.findAll({
        attributes: [
          "userId",
          [Sequelize.fn("SUM", Sequelize.col("totalRevenue")), "totalRevenue"],
        ],
        include: [
          {
            model: User,
            attributes: ["pubkey"],
            include: [
              {
                model: UserInfo,
                attributes: ["username", "photoUrl"],
              },
            ],
          },
        ],
        group: ["userId", "user.id", "user->user_info.id"],
        order: [[Sequelize.literal("totalRevenue"), "DESC"]],
        limit: 3,
        raw: false,
      });

      const ranked = creators.map((row, index) => ({
        rank: index + 1,
        userId: row.userId,
        walletAddress: row.user?.pubkey,
        username: row.user?.user_info?.username ?? null,
        photoUrl: row.user?.user_info?.photoUrl ?? null,
        totalRevenue: Number(row.dataValues.totalRevenue),
      }));

      return respond(
        res,
        httpStatus.OK,
        "Top raffle creators fetched!",
        ranked
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
      const stats = await Raffle.findOne({
        attributes: [
          [Sequelize.fn("SUM", Sequelize.col("totalRevenue")), "totalRevenue"],
          [
            Sequelize.fn("SUM", Sequelize.col("ticketsSold")),
            "totalTicketsSold",
          ],
          [
            Sequelize.fn("SUM", Sequelize.col("platformRevenue")),
            "totalPlatformRevenue",
          ],
        ],
        raw: true,
      });

      const liveRaffleCount = await Raffle.count({
        where: {
          status: RAFFLE_STATUS.LIVE,
        },
      });

      const response = {
        totalRevenue: Number(stats.totalRevenue || 0),
        totalTicketsSold: Number(stats.totalTicketsSold || 0),
        totalPlatformRevenue: Number(stats.totalPlatformRevenue || 0),
        liveRaffleCount,
      };

      return respond(res, httpStatus.OK, "Dashboard stats fetched!", response);
    } catch (error) {
      console.error(error);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, "Server error", {
        error: error.message,
      });
    }
  }
}

module.exports = AdminController;
