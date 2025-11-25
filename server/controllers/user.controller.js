const {
  User,
  UserInfo,
  UserCurrencyTransaction,
  UserReward,
} = require("../models");
const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");
// const { getPendingClaimedEmbers } = require("../services/currency");

// handling implementations. Keep controller methods centralized.
class UserController {
  // static async getBalanceFromUserData(user) {
  //   // const pendingClaimedEmbers = await getPendingClaimedEmbers(user.id);
  //   const bonusEmbers = await UserCurrencyTransaction.getTotalLoadedCurrency(
  //     user.id
  //   );
  //   const balance =
  //     user.totalLoadCurrency +
  //     user.totalRewardCurrency +
  //     Number(bonusEmbers) -
  //     // (user.totalSpendCurrency + user.totalClaimCurrency + pendingClaimedEmbers);
  //     user.totalSpendCurrency;
  //   return balance;
  // }

  static async getUserInfo(req, res) {
    try {
      const userId = req.query.userId;

      if (!userId)
        return respond(
          res,
          httpStatus.INTERNAL_SERVER_ERROR,
          "User Id not Found"
        );

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
              "userId",
              "description",
              "username",
              "photoUrl",
            ],
            required: false,
          },
        ],
        attributes: ["id", "pubkey"],
      });

      if (user) {
        return respond(res, httpStatus.OK, "Successful!", { user });
      } else {
        return respond(res, httpStatus.NOT_FOUND, "User not found");
      }
    } catch (err) {
      logger.error(err);
      return respond(res, httpStatus.OK, parseSequelizeErrors(err));
    }
  }

  static async postUserInfo(req, res, next) {
    const userInfo = {
      userId: req.payload.id,
      description: req.body.description,
      username: req.body.username,
      email: req.body.email,
      photoUrl: req.body.photoUrl,
    };

    try {
      await UserInfo.create(userInfo);
      return respond(res, httpStatus.OK, "Successful!");
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async updateUserInfo(req, res) {
    try {
      const userInfoData = {
        userId: req.payload.id,
        description: req.body.description,
        username: req.body.username,
        email: req.body.email,
        photoUrl: req.body.photoUrl,
      };

      const existingUserInfo = await UserInfo.findOne({
        where: { userId: req.payload.id },
      });

      if (existingUserInfo) {
        existingUserInfo.description =
          userInfoData.description || existingUserInfo.description;
        existingUserInfo.username =
          userInfoData.username || existingUserInfo.username;
        await existingUserInfo.save();
        return respond(res, httpStatus.OK, "User info updated successfully!", {
          data: existingUserInfo,
        });
      } else {
        await UserInfo.create(userInfoData);
        return respond(res, httpStatus.OK, "User info created successfully!");
      }
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
