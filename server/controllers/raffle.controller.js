const {
  Raffle,
  RaffleDetail,
  User,
  UserInfo,
  RaffleReward,
  VerifiedCollection,
} = require("../models");
const { status: httpStatus, default: status } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");
const { Op } = require("sequelize");
const {
  TOKEN_TYPE,
  RAFFLE_STATUS,
  RAFFLE_REWARD_TYPES,
  mapEnumValue,
} = require("../config/data");
const getFormattedDate = require("../util/getFormattedDate");

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
          {
            model: RaffleReward,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const formattedRaffles = raffles.map((raffle) => {
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

      return respond(
        res,
        httpStatus.OK,
        "Active raffles retrieved successfully",
        {
          // raffles,
          raffles: formattedRaffles,
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
          {
            model: RaffleReward,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const formattedRaffles = raffles.map((raffle) => {
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

      return respond(
        res,
        httpStatus.OK,
        "Ended raffles retrieved successfully",
        {
          // raffles,
          raffles: formattedRaffles,
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

  static async getUpcomingRaffles(req, res) {
    try {
      const raffles = await Raffle.findAll({
        where: {
          status: RAFFLE_STATUS.UPCOMING,
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
          {
            model: RaffleReward,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const formattedRaffles = raffles.map((raffle) => {
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

      return respond(
        res,
        httpStatus.OK,
        "Upcoming raffles retrieved successfully",
        { raffles: formattedRaffles }
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
          {
            model: RaffleReward,
          },
        ],
        order: [[RaffleDetail, "featuredPosition", "ASC"]],
      });

      const formattedRaffles = raffles.map((raffle) => {
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

      return respond(
        res,
        httpStatus.OK,
        "Featured raffles retrieved successfully",
        {
          // raffles,
          raffles: formattedRaffles,
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

      const userId = raffle.userId;

      const userData = await User.findOne({ where: { id: userId } });

      // Calculate progress percentage
      const progressPercentage =
        raffle.totalTickets > 0
          ? ((raffle.ticketsSold / raffle.totalTickets) * 100).toFixed(2)
          : 0;

      return respond(res, httpStatus.OK, "Raffle retrieved successfully", {
        raffle,
        userData,
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

  // static async createRaffle(req, res) {
  //   try {
  //     const userId = req.payload?.id;

  //     const {
  //       title,
  //       description,
  //       imageUrl,
  //       totalTickets,
  //       ticketPrice,
  //       tokenType,
  //       numberOfWinners,
  //       startDate,
  //       endDate,
  //       // RaffleDetail fields
  //       requiresNftVerification,
  //       verifiedCollectionRequired,
  //       additionalJson,
  //     } = req.body;

  //     if (!title || !totalTickets || !ticketPrice || !startDate || !endDate) {
  //       return respond(
  //         res,
  //         httpStatus.BAD_REQUEST,
  //         "Missing required fields: title, totalTickets, ticketPrice, startDate, endDate"
  //       );
  //     }

  //     if (new Date(startDate) >= new Date(endDate)) {
  //       return respond(
  //         res,
  //         httpStatus.BAD_REQUEST,
  //         "Start date must be before end date"
  //       );
  //     }

  //     const raffle = await Raffle.create({
  //       userId,
  //       title,
  //       description,
  //       imageUrl,
  //       totalTickets,
  //       ticketPrice,
  //       ticketsSold: 0,
  //       tokenType: TOKEN_TYPE[tokenType] || TOKEN_TYPE.SOLANA,
  //       numberOfWinners: numberOfWinners || 1,
  //       startDate,
  //       endDate,
  //     });

  //     await RaffleDetail.create({
  //       raffleId: raffle.id,
  //       isFeatured: false,
  //       requiresNftVerification: requiresNftVerification || false,
  //       verifiedCollectionRequired: verifiedCollectionRequired || null,
  //       additionalJson: additionalJson || null,
  //     });

  //     const createdRaffle = await Raffle.findOne({
  //       where: { id: raffle.id },
  //       include: [
  //         {
  //           model: RaffleDetail,
  //         },
  //       ],
  //     });

  //     return respond(res, httpStatus.OK, "Raffle created successfully", {
  //       raffle: createdRaffle,
  //     });
  //   } catch (err) {
  //     logger.error(err);
  //     return respond(
  //       res,
  //       httpStatus.INTERNAL_SERVER_ERROR,
  //       parseSequelizeErrors(err)
  //     );
  //   }
  // }

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
        startDate,
        endDate,
        numberOfWinners,
        requiresNftVerification,
        verifiedCollectionRequired,
        additionalJson,
        rewards,
      } = req.body;

      const raffleStatus = req.body.status || RAFFLE_STATUS.UPCOMING;

      const statusEnum = RAFFLE_STATUS[raffleStatus] ?? RAFFLE_STATUS.UPCOMING;

      if (statusEnum !== RAFFLE_STATUS.DRAFT) {
        if (!title || !totalTickets || !ticketPrice || !startDate || !endDate) {
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            "Missing required fields: title, totalTickets, ticketPrice, startDate, endDate"
          );
        }

        if (!Array.isArray(rewards) || rewards.length === 0) {
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            "At least one reward is required"
          );
        }

        if (new Date(startDate) >= new Date(endDate)) {
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            "Start date must be before end date"
          );
        }

        if (!Array.isArray(rewards) || rewards.length === 0) {
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            "At least one reward is required"
          );
        }

        if (new Date(startDate) >= new Date(endDate)) {
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            "Start date must be before end date"
          );
        }
      }

      let totalWinners = 1;
      if (numberOfWinners || rewards) {
        totalWinners = numberOfWinners || rewards.length;
      }

      const raffle = await Raffle.create({
        userId,
        title,
        description,
        imageUrl,
        totalTickets: totalTickets || 0,
        ticketPrice: ticketPrice || 0,
        ticketsSold: 0,
        tokenType: TOKEN_TYPE[tokenType] || TOKEN_TYPE.SOLANA,
        numberOfWinners: totalWinners,
        startDate: startDate || getFormattedDate(3),
        endDate: endDate || getFormattedDate(10),
        status: statusEnum,
      });

      await RaffleDetail.create({
        raffleId: raffle.id,
        isFeatured: false,
        requiresNftVerification: requiresNftVerification || false,
        verifiedCollectionRequired: verifiedCollectionRequired || null,
        additionalJson: additionalJson || null,
      });

      if (rewards) {
        const rewardsToInsert = rewards.map((r) => ({
          raffleId: raffle.id,
          rewardType: RAFFLE_REWARD_TYPES[r.rewardType],
          rewardName: r.rewardName,
          mintAddress: r.mintAddress,
          amount: r.amount,
          imageUrl: r.imageUrl,
          metadataJson: r.metadataJson,
        }));

        await RaffleReward.bulkCreate(rewardsToInsert);
      }
      const createdRaffle = await Raffle.findOne({
        where: { id: raffle.id },
        include: [{ model: RaffleDetail }, { model: RaffleReward }],
      });

      const raffleData = createdRaffle.get({ plain: true });

      raffleData.tokenType = mapEnumValue(TOKEN_TYPE, raffleData.tokenType);
      raffleData.status = mapEnumValue(RAFFLE_STATUS, raffleData.status);

      raffleData.raffle_rewards = raffleData.raffle_rewards.map((reward) => ({
        ...reward,
        rewardType: mapEnumValue(TOKEN_TYPE, reward.rewardType),
      }));

      return respond(res, httpStatus.OK, "Raffle created successfully", {
        raffle: raffleData,
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

  static async filterRaffles(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const { status, tokenType, price, collection, search = "" } = req.query;

      let whereClause = {
        status: { [Op.ne]: RAFFLE_STATUS.DRAFT },
      };

      // Filter by status
      if (status) {
        const statusMap = {
          live: RAFFLE_STATUS.LIVE,
          ended: RAFFLE_STATUS.ENDED,
          upcoming: RAFFLE_STATUS.UPCOMING,
        };
        if (statusMap[status.toLowerCase()] !== undefined) {
          whereClause.status = statusMap[status.toLowerCase()];
        }
      }

      // Filter by token type
      if (tokenType && tokenType !== "all") {
        const tokenMap = {
          sol: TOKEN_TYPE.SOLANA,
          usdc: TOKEN_TYPE.USDC,
          token: TOKEN_TYPE.SPL_TOKEN,
        };
        if (tokenMap[tokenType.toLowerCase()] !== undefined) {
          whereClause.tokenType = tokenMap[tokenType.toLowerCase()];
        }
      }

      // Search by title
      if (search) {
        whereClause.title = { [Op.like]: `%${search}%` };
      }

      // Prepare include array
      let include = [
        { model: RaffleDetail, required: false },
        { model: User, attributes: ["id", "pubkey"], required: false },
        { model: RaffleReward, required: false },
      ];

      // Filter by verified collection
      if (collection === "verified") {
        const verifiedAddresses = await VerifiedCollection.findAll({
          attributes: ["address"],
        });
        const addresses = verifiedAddresses.map((v) => v.address);

        // Override RaffleDetail include to add where clause
        include = include.map((inc) => {
          if (inc.model === RaffleDetail) {
            return {
              ...inc,
              required: true, // must join to filter
              where: {
                verifiedCollectionRequired: { [Op.in]: addresses },
              },
            };
          }
          return inc;
        });
      }

      // Determine order
      let order = [["createdAt", "DESC"]];
      if (price === "lowtohigh") order = [["ticketPrice", "ASC"]];
      if (price === "hightolow") order = [["ticketPrice", "DESC"]];

      // Query raffles
      const { count, rows: raffles } = await Raffle.findAndCountAll({
        where: whereClause,
        include,
        order,
        limit,
        offset,
      });

      const formattedRaffles = raffles.map((raffle) => {
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

      return respond(res, httpStatus.OK, "Raffles retrieved successfully", {
        formattedRaffles,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (err) {
      logger.error(err);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, err.message);
    }
  }

  static async getRaffleDraft(req, res) {
    try {
      const userId = req.payload?.id;

      const userData = await User.findOne({ where: { id: userId } });

      const raffle = await Raffle.findOne({
        where: { userId },
        include: [{ model: RaffleDetail }, { model: RaffleReward }],
      });

      raffle.tokenType = mapEnumValue(TOKEN_TYPE, raffle.tokenType);
      raffle.status = mapEnumValue(RAFFLE_STATUS, raffle.status);

      raffle.raffle_rewards = raffle.raffle_rewards.map((reward) => ({
        ...reward,
        rewardType: mapEnumValue(TOKEN_TYPE, reward.rewardType),
      }));

      return respond(res, httpStatus.OK, "Raffle retrieved successfully", {
        raffle,
        userData,
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

  static async updateDraftRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { raffleId } = req.params;

      const draft = await Raffle.findOne({
        where: { id: raffleId, userId, status: RAFFLE_STATUS.DRAFT },
        include: [{ model: RaffleDetail }, { model: RaffleReward }],
      });

      if (!draft) {
        return respond(res, httpStatus.NOT_FOUND, "Draft raffle not found");
      }

      const {
        title,
        description,
        imageUrl,
        totalTickets,
        ticketPrice,
        startDate,
        endDate,
        numberOfWinners,
        requiresNftVerification,
        verifiedCollectionRequired,
        additionalJson,
        rewards,
        tokenType,
      } = req.body;

      await draft.update({
        title: title ?? draft.title,
        description: description ?? draft.description,
        imageUrl: imageUrl ?? draft.imageUrl,
        totalTickets: totalTickets ?? draft.totalTickets,
        ticketPrice: ticketPrice ?? draft.ticketPrice,
        startDate: startDate ?? draft.startDate,
        endDate: endDate ?? draft.endDate,
        numberOfWinners: numberOfWinners ?? draft.numberOfWinners,
        tokenType: tokenType ? TOKEN_TYPE[tokenType] : draft.tokenType,
      });

      await draft.raffle_detail.update({
        requiresNftVerification:
          requiresNftVerification ??
          draft.raffle_detail.requiresNftVerification,
        verifiedCollectionRequired:
          verifiedCollectionRequired ??
          draft.raffle_detail.verifiedCollectionRequired,
        additionalJson: additionalJson ?? draft.raffle_detail.additionalJson,
      });

      if (Array.isArray(rewards)) {
        await RaffleReward.destroy({ where: { raffleId } });

        const rewardsToInsert = rewards.map((r) => ({
          raffleId,
          rewardType: RAFFLE_REWARD_TYPES[r.rewardType],
          rewardName: r.rewardName,
          mintAddress: r.mintAddress,
          amount: r.amount,
        }));

        await RaffleReward.bulkCreate(rewardsToInsert);
      }

      return respond(res, httpStatus.OK, "Draft Raffle Updated Successfully");
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async deleteDraftRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { raffleId } = req.params;

      const draft = await Raffle.findOne({
        where: { id: raffleId, userId, status: RAFFLE_STATUS.DRAFT },
      });

      if (!draft) {
        return respond(res, httpStatus.NOT_FOUND, "Draft Raffle Not Found");
      }

      await RaffleDetail.destroy({ where: { raffleId } });
      await RaffleReward.destroy({ where: { raffleId } });

      await draft.destroy();

      return respond(res, httpStatus.OK, "Draft Raffle Deleted Successfully");
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
