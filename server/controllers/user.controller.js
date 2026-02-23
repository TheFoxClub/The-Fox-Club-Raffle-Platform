const {
  User,
  UserInfo,
  Raffle,
  RaffleTicket,
  SplTokenSendTransaction,
} = require("../models");
const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");
const {
  mapEnumValue,
  TOKEN_TYPE,
  RAFFLE_STATUS,
  SPL_TOKEN_SEND_TRANSACTION_TYPE,
  SPL_TOKEN_SEND_TX_STATUS,
} = require("../config/data");

class UserController {
  static async getUserInfo(req, res) {
    try {
      const userId = req.payload.id;

      const user = await User.findOne({
        where: {
          id: userId,
        },
        include: [
          {
            model: UserInfo,
            attributes: ["id", "email", "description", "username", "photoUrl"],
            required: false,
          },
          {
            model: RaffleTicket,
            attributes: ["id", "ticketNumber", "raffleId"],
          },
        ],
      });

      const rafflesWon = await RaffleTicket.count({
        where: {
          userId: userId,
          isWinner: 1,
        },
        distinct: true,
        col: "raffleId",
      });

      const solSpentData = await SplTokenSendTransaction.findAll({
        where: {
          senderPubkey: user.pubkey,
          type: SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA,
          status: SPL_TOKEN_SEND_TX_STATUS.SUCCESS,
        },
      });

      let totalSolSpent = 0;

      solSpentData.forEach((tx) => {
        const commission = parseFloat(tx.commissionAmount || "0");
        const creator = parseFloat(tx.creatorAmount || "0");

        totalSolSpent += commission + creator;
      });

      totalSolSpent = Number(totalSolSpent.toFixed(9));

      if (user) {
        const totalTickets = user.raffle_tickets?.length || 0;

        return respond(res, httpStatus.OK, "Successful!", {
          user,
          ticketsBought: totalTickets,
          totalSolSpent,
          rafflesWon,
        });
      } else {
        return respond(res, httpStatus.NOT_FOUND, "User not found");
      }
    } catch (err) {
      logger.error(err);
      return respond(res, httpStatus.OK, parseSequelizeErrors(err));
    }
  }

  static async getAnyUserInfo(req, res) {
    try {
      const userId = req.params.id;

      const user = await User.findOne({
        where: {
          id: userId,
        },
        include: [
          {
            model: UserInfo,
            attributes: [
              "id",
              "email",
              "description",
              "username",
              "photoUrl",
              // "twitter",
              // "discord",
            ],
            required: false,
          },
          {
            model: Raffle,
            attributes: [
              "id",
              "title",
              "description",
              "imageUrl",
              "ticketPrice",
              "ticketsSold",
              "totalTickets",
              "totalRevenue",
              "tokenType",
              "numberOfWinners",
              "startDate",
              "endDate",
              "status",
              "endedAt",
            ],
          },
        ],
      });

      if (user) {
        if (user.raffles.length > 0) {
          const formattedRaffles = user.raffles.map((raffle) => {
            const data = raffle.get({ plain: true });

            data.tokenType = mapEnumValue(TOKEN_TYPE, data.tokenType);
            data.status = mapEnumValue(RAFFLE_STATUS, data.status);

            if (data.raffle_rewards) {
              data.raffle_rewards = data.raffle_rewards.map((reward) => ({
                ...reward,
                rewardType: mapEnumValue(TOKEN_TYPE, reward.rewardType),
              }));
            }

            return data;
          });

          return respond(res, httpStatus.OK, "User Info Fetched Successfully", {
            user,
            formattedRaffles,
          });
        }

        return respond(res, httpStatus.OK, "User Info Fetched Successfully", {
          user,
        });
      } else {
        return respond(res, httpStatus.NOT_FOUND, "User not found");
      }
    } catch (err) {
      logger.error(err);
      return respond(res, httpStatus.OK, parseSequelizeErrors(err));
    }
  }

  static async createOrUpdateUserInfo(req, res) {
    try {
      const userId = req.payload.id;

      const allowedFields = [
        "description",
        "username",
        "email",
        "photoUrl",
        // "twitter",
        // "discord",
      ];

      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      updates.userId = userId;

      const [record, created] = await UserInfo.findOrCreate({
        where: { userId },
        defaults: updates,
      });

      if (!created) {
        await record.update(updates);
      }

      const updatedUserInfo = await UserInfo.findOne({
        where: { userId },
        attributes: [
          "id",
          "email",
          "description",
          "username",
          "photoUrl",
          // "twitter",
          // "discord",
        ],
      });

      return respond(
        res,
        httpStatus.OK,
        created
          ? "User info created successfully!"
          : "User info updated successfully!",
        { data: updatedUserInfo }
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

  // XP-related methods
  static async getUserXp(req, res) {
    try {
      const userId = req.payload.id;
      const XpService = require("../services/xp.service");

      const xpSummary = await XpService.getUserXpSummary(userId);

      return respond(
        res,
        httpStatus.OK,
        "User XP retrieved successfully",
        xpSummary
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

  static async getUserXpHistory(req, res) {
    try {
      const userId = req.payload.id;
      const { page = 1, limit = 20, configKey, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;
      const { XpTable, XpConfig, Raffle } = require("../models");
      const { Op } = require("sequelize");

      let whereClause = { userId };
      let includeClause = [
        {
          model: XpConfig,
          as: "config",
          attributes: ["configKey", "description"],
          required: false,
        },
      ];

      if (configKey) {
        includeClause[0].where = { configKey };
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

      const { count, rows: history } = await XpTable.findAndCountAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          ...includeClause,
          {
            model: Raffle,
            as: "raffle",
            attributes: ["id", "title", "imageUrl"],
            required: false,
          },
          {
            model: SplTokenSendTransaction,
            as: "transaction",
            attributes: ["id", "txId", "uiAmount"],
            required: false,
          },
        ],
      });

      return respond(res, httpStatus.OK, "XP history retrieved successfully", {
        history,
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

  static async getUserXpRank(req, res) {
    try {
      const userId = req.payload.id;
      const { Op } = require("sequelize");

      const user = await User.findByPk(userId, {
        attributes: ["id", "pubkey", "totalXp"],
      });

      if (!user) {
        return respond(res, httpStatus.NOT_FOUND, "User not found");
      }

      const rank =
        (await User.count({
          where: {
            totalXp: { [Op.gt]: user.totalXp },
          },
        })) + 1;

      const totalUsers = await User.count({
        where: {
          totalXp: { [Op.gt]: 0 },
        },
      });

      // Get users around this user's rank (±5 positions)
      const nearbyUsers = await User.findAll({
        attributes: ["id", "pubkey", "totalXp"],
        where: {
          totalXp: { [Op.gt]: 0 },
        },
        order: [["totalXp", "DESC"]],
        limit: 11,
        offset: Math.max(0, rank - 6),
        include: [
          {
            model: UserInfo,
            attributes: ["username"],
            required: false,
          },
        ],
      });

      return respond(
        res,
        httpStatus.OK,
        "User XP rank retrieved successfully",
        {
          user: {
            id: user.id,
            pubkey: user.pubkey,
            totalXp: parseFloat(user.totalXp || 0),
          },
          rank,
          totalUsers,
          percentile:
            totalUsers > 0
              ? Math.round(((totalUsers - rank + 1) / totalUsers) * 100)
              : 0,
          nearbyUsers,
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

  // for public endpoint
  static async getXpLeaderboard(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      const { Op } = require("sequelize");

      const { count, rows: users } = await User.findAndCountAll({
        attributes: ["id", "pubkey", "totalXp"],
        where: {
          totalXp: { [Op.gt]: 0 },
        },
        order: [["totalXp", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: UserInfo,
            attributes: ["username"],
            required: false,
          },
        ],
      });

      const usersWithRank = users.map((user, index) => ({
        ...user.toJSON(),
        rank: offset + index + 1,
        totalXp: parseFloat(user.totalXp || 0),
      }));

      return respond(
        res,
        httpStatus.OK,
        "XP leaderboard retrieved successfully",
        {
          users: usersWithRank,
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
}

module.exports = UserController;
