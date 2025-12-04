const { User, UserInfo } = require("../models");
const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");

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
        ],
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
