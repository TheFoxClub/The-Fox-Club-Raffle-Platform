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
}

module.exports = UserController;
