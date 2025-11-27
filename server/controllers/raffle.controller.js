const { Raffle, RaffleDetail, User, UserInfo } = require("../models");
const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");
const { Op } = require("sequelize");
const { TOKEN_TYPE, RAFFLE_STATUS } = require("../config/data");

class RaffleController {
  static async getLiveRaffles(req, res) {
    try {
      const raffles = await Raffle.findAll({
        where: {
          status: RAFFLE_STATUS.LIVE,
          endedAt: null,
        },
        include: [
          {
            model: RaffleDetail,
            attributes: [
              "isFeatured",
              "featuredPosition",
              "requiresNftVerification",
              "verifiedCollectionRequired",
            ],
          },
          {
            model: User,
            attributes: ["id", "pubkey"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return respond(
        res,
        httpStatus.OK,
        "Active raffles retrieved successfully",
        {
          raffles,
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

  static async getEndedRaffles(req, res) {
    try {
      const raffles = await Raffle.findAll({
        where: {
          status: RAFFLE_STATUS.ENDED,
        },
        include: [
          {
            model: RaffleDetail,
            attributes: [
              "isFeatured",
              "featuredPosition",
              "requiresNftVerification",
              "verifiedCollectionRequired",
            ],
          },
          {
            model: User,
            attributes: ["id", "pubkey"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return respond(
        res,
        httpStatus.OK,
        "Ended raffles retrieved successfully",
        {
          raffles,
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

  static async getFeaturedRaffles(req, res) {
    try {
      const raffles = await Raffle.findAll({
        where: {
          endedAt: null,
        },
        include: [
          {
            model: RaffleDetail,
            where: {
              isFeatured: true,
              featuredUntil: { [Op.gte]: new Date() },
            },
            attributes: [
              "isFeatured",
              "featuredPosition",
              "featuredUntil",
              "requiresNftVerification",
              "verifiedCollectionRequired",
            ],
          },
          {
            model: User,
            attributes: ["id", "pubkey"],
          },
        ],
        order: [[RaffleDetail, "featuredPosition", "ASC"]],
      });

      return respond(
        res,
        httpStatus.OK,
        "Featured raffles retrieved successfully",
        {
          raffles,
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

  static async getRaffleById(req, res) {
    try {
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
        include: [{ model: RaffleDetail }],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      // Calculate progress percentage
      const progressPercentage =
        raffle.totalTickets > 0
          ? ((raffle.ticketsSold / raffle.totalTickets) * 100).toFixed(2)
          : 0;

      return respond(res, httpStatus.OK, "Raffle retrieved successfully", {
        raffle,
        progressPercentage,
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

  static async getRafflesByUserId(req, res) {
    try {
      const { userId } = req.params;

      const raffles = await Raffle.findAll({
        where: { userId },
        include: [
          {
            model: RaffleDetail,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return respond(
        res,
        httpStatus.OK,
        "User raffles retrieved successfully",
        {
          raffles,
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

  static async createRaffle(req, res) {
    try {
      const userId = req.payload?.id;

      const {
        title,
        description,
        imageUrl,
        totalTickets,
        ticketPrice,
        tokenType,
        numberOfWinners,
        startDate,
        endDate,
        // RaffleDetail fields
        requiresNftVerification,
        verifiedCollectionRequired,
        additionalJson,
      } = req.body;

      if (!title || !totalTickets || !ticketPrice || !startDate || !endDate) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Missing required fields: title, totalTickets, ticketPrice, startDate, endDate"
        );
      }

      if (new Date(startDate) >= new Date(endDate)) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Start date must be before end date"
        );
      }

      const raffle = await Raffle.create({
        userId,
        title,
        description,
        imageUrl,
        totalTickets,
        ticketPrice,
        ticketsSold: 0,
        tokenType: TOKEN_TYPE[tokenType] || TOKEN_TYPE.SOLANA,
        numberOfWinners: numberOfWinners || 1,
        startDate,
        endDate,
      });

      await RaffleDetail.create({
        raffleId: raffle.id,
        isFeatured: false,
        requiresNftVerification: requiresNftVerification || false,
        verifiedCollectionRequired: verifiedCollectionRequired || null,
        additionalJson: additionalJson || null,
      });

      const createdRaffle = await Raffle.findOne({
        where: { id: raffle.id },
        include: [
          {
            model: RaffleDetail,
          },
        ],
      });

      return respond(res, httpStatus.OK, "Raffle created successfully", {
        raffle: createdRaffle,
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

  static async updateRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;

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

      if (raffle.userId !== userId) {
        return respond(
          res,
          httpStatus.FORBIDDEN,
          "You are not authorized to update this raffle"
        );
      }

      // Cannot update if raffle has already started and has tickets sold
      const now = new Date();
      if (raffle.startDate <= now && raffle.ticketsSold > 0) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Cannot update raffle after tickets have been sold"
        );
      }

      const {
        title,
        description,
        imageUrl,
        totalTickets,
        ticketPrice,
        tokenType,
        numberOfWinners,
        startDate,
        endDate,
        // RaffleDetail fields
        requiresNftVerification,
        verifiedCollectionRequired,
        additionalJson,
      } = req.body;

      // Update raffle fields
      if (title !== undefined) raffle.title = title;
      if (description !== undefined) raffle.description = description;
      if (imageUrl !== undefined) raffle.imageUrl = imageUrl;
      if (totalTickets !== undefined) raffle.totalTickets = totalTickets;
      if (ticketPrice !== undefined) raffle.ticketPrice = ticketPrice;
      if (tokenType !== undefined) raffle.tokenType = tokenType;
      if (numberOfWinners !== undefined)
        raffle.numberOfWinners = numberOfWinners;
      if (startDate !== undefined) raffle.startDate = startDate;
      if (endDate !== undefined) raffle.endDate = endDate;

      await raffle.save();

      // Update raffle details if exists
      if (raffle.RaffleDetail) {
        const detail = raffle.RaffleDetail;
        if (requiresNftVerification !== undefined)
          detail.requiresNftVerification = requiresNftVerification;
        if (verifiedCollectionRequired !== undefined)
          detail.verifiedCollectionRequired = verifiedCollectionRequired;
        if (additionalJson !== undefined)
          detail.additionalJson = additionalJson;
        await detail.save();
      }

      const updatedRaffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
          },
        ],
      });

      return respond(res, httpStatus.OK, "Raffle updated successfully", {
        raffle: updatedRaffle,
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

  static async deleteRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      if (raffle.userId !== userId) {
        return respond(
          res,
          httpStatus.FORBIDDEN,
          "You are not authorized to delete this raffle"
        );
      }

      // Cannot delete if tickets have been sold
      if (raffle.ticketsSold > 0) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Cannot delete raffle with sold tickets. Please end the raffle instead."
        );
      }

      await RaffleDetail.destroy({
        where: { raffleId: id },
      });

      await raffle.destroy();

      return respond(res, httpStatus.OK, "Raffle deleted successfully");
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async endRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      if (raffle.userId !== userId) {
        return respond(
          res,
          httpStatus.FORBIDDEN,
          "You are not authorized to end this raffle"
        );
      }

      if (raffle.endedAt) {
        return respond(res, httpStatus.BAD_REQUEST, "Raffle has already ended");
      }

      raffle.endedAt = new Date();
      await raffle.save();

      // TODO: Trigger winner selection logic here
      // This would involve randomly selecting winner(s) from ticket holders

      return respond(res, httpStatus.OK, "Raffle ended successfully", {
        raffle,
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
}

module.exports = RaffleController;
