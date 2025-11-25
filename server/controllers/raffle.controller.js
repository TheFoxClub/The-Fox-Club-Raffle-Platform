const { Raffle, RaffleDetail, User, UserInfo } = require("../models");
const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");
const { Op } = require("sequelize");

class RaffleController {
  // PUBLIC ENDPOINTS

  /**
   * Get all active raffles (for public display)
   * GET /raffle/active
   */
  static async getActiveRaffles(req, res) {
    try {
      const raffles = await Raffle.findAll({
        where: {
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() },
          endedAt: null,
        },
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
            attributes: [
              "isFeatured",
              "featuredPosition",
              "requiresNftVerification",
              "verifiedCollectionRequired",
            ],
          },
          {
            model: User,
            as: "User",
            attributes: ["id", "pubkey"],
            include: [
              {
                model: UserInfo,
                as: "UserInfo",
                attributes: ["username", "photoUrl"],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return respond(res, httpStatus.OK, "Active raffles retrieved successfully", {
        raffles,
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

  /**
   * Get featured raffles for homepage
   * GET /raffle/featured
   */
  static async getFeaturedRaffles(req, res) {
    try {
      const raffles = await Raffle.findAll({
        where: {
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() },
          endedAt: null,
        },
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
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
            as: "User",
            attributes: ["id", "pubkey"],
            include: [
              {
                model: UserInfo,
                as: "UserInfo",
                attributes: ["username", "photoUrl"],
              },
            ],
          },
        ],
        order: [[RaffleDetail, "featuredPosition", "ASC"]],
      });

      return respond(res, httpStatus.OK, "Featured raffles retrieved successfully", {
        raffles,
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

  /**
   * Get single raffle details by ID
   * GET /raffle/:id
   */
  static async getRaffleById(req, res) {
    try {
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
          },
          {
            model: User,
            as: "User",
            attributes: ["id", "pubkey"],
            include: [
              {
                model: UserInfo,
                as: "UserInfo",
                attributes: ["username", "photoUrl", "email"],
              },
            ],
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      // Calculate progress percentage
      const progressPercentage = raffle.totalTickets > 0
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

  /**
   * Get raffles by user ID (for user's profile/dashboard)
   * GET /raffle/user/:userId
   */
  static async getRafflesByUserId(req, res) {
    try {
      const { userId } = req.params;

      const raffles = await Raffle.findAll({
        where: { userId },
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return respond(res, httpStatus.OK, "User raffles retrieved successfully", {
        raffles,
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

  // USER ENDPOINTS (require authentication)

  /**
   * Create a new raffle
   * POST /raffle
   */
  static async createRaffle(req, res) {
    try {
      const userId = req.payload?.id;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
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

      // Validation
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

      // Create raffle
      const raffle = await Raffle.create({
        userId,
        title,
        description,
        imageUrl,
        totalTickets,
        ticketPrice,
        ticketsSold: 0,
        tokenType: tokenType || 0,
        numberOfWinners: numberOfWinners || 1,
        startDate,
        endDate,
      });

      // Create raffle details
      await RaffleDetail.create({
        raffleId: raffle.id,
        isFeatured: false,
        requiresNftVerification: requiresNftVerification || false,
        verifiedCollectionRequired: verifiedCollectionRequired || null,
        additionalJson: additionalJson || null,
      });

      // Fetch complete raffle with details
      const createdRaffle = await Raffle.findOne({
        where: { id: raffle.id },
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
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

  /**
   * Update a raffle (only by owner)
   * PUT /raffle/:id
   */
  static async updateRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      const raffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      // Check ownership
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
      if (numberOfWinners !== undefined) raffle.numberOfWinners = numberOfWinners;
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
        if (additionalJson !== undefined) detail.additionalJson = additionalJson;
        await detail.save();
      }

      // Fetch updated raffle
      const updatedRaffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
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

  /**
   * Delete a raffle (only by owner, only if no tickets sold)
   * DELETE /raffle/:id
   */
  static async deleteRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      const raffle = await Raffle.findOne({
        where: { id },
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      // Check ownership
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

      // Delete raffle details first (due to foreign key)
      await RaffleDetail.destroy({
        where: { raffleId: id },
      });

      // Delete raffle
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

  /**
   * Buy ticket for a raffle
   * POST /raffle/:id/buy-ticket
   */
  static async buyTicket(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;
      const { quantity, walletAddress, transactionSignature } = req.body;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      if (!quantity || quantity < 1) {
        return respond(res, httpStatus.BAD_REQUEST, "Invalid ticket quantity");
      }

      if (!walletAddress || !transactionSignature) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Wallet address and transaction signature are required"
        );
      }

      const raffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      // Check if raffle is active
      const now = new Date();
      if (raffle.startDate > now) {
        return respond(res, httpStatus.BAD_REQUEST, "Raffle has not started yet");
      }

      if (raffle.endDate < now || raffle.endedAt) {
        return respond(res, httpStatus.BAD_REQUEST, "Raffle has ended");
      }

      // Check if tickets are available
      const availableTickets = raffle.totalTickets - raffle.ticketsSold;
      if (quantity > availableTickets) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Only ${availableTickets} tickets available`
        );
      }

      // TODO: Verify NFT collection if required
      if (
        raffle.RaffleDetail?.requiresNftVerification &&
        raffle.RaffleDetail?.verifiedCollectionRequired
      ) {
        // Add NFT verification logic here
      }

      // TODO: Verify transaction on blockchain
      // This would involve checking the transaction signature is valid
      // and matches the expected amount (quantity * ticketPrice)

      // Update tickets sold
      raffle.ticketsSold += quantity;
      await raffle.save();

      // TODO: Create ticket records in a separate Ticket model
      // This would store individual ticket ownership

      return respond(res, httpStatus.OK, "Ticket(s) purchased successfully", {
        raffle: {
          id: raffle.id,
          ticketsSold: raffle.ticketsSold,
          ticketsRemaining: raffle.totalTickets - raffle.ticketsSold,
        },
        purchase: {
          quantity,
          totalCost: (quantity * parseFloat(raffle.ticketPrice)).toFixed(2),
          transactionSignature,
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

  /**
   * End a raffle (manual) - only by owner or admin
   * POST /raffle/:id/end
   */
  static async endRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      const raffle = await Raffle.findOne({
        where: { id },
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      // Check ownership (or admin - add admin check if needed)
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

      // End the raffle
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

  // ADMIN ENDPOINTS (require admin authentication)

  /**
   * Get all raffles (admin)
   * GET /raffle/admin/all
   */
  static async getAllRaffles(req, res) {
    try {
      // TODO: Add admin authentication check
      const userId = req.payload?.id;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      const { status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = {};
      const now = new Date();

      // Filter by status
      if (status === "live") {
        whereClause = {
          startDate: { [Op.lte]: now },
          endDate: { [Op.gte]: now },
          endedAt: null,
        };
      } else if (status === "ended") {
        whereClause = {
          [Op.or]: [{ endDate: { [Op.lt]: now } }, { endedAt: { [Op.not]: null } }],
        };
      } else if (status === "upcoming") {
        whereClause = {
          startDate: { [Op.gt]: now },
        };
      }

      const { count, rows: raffles } = await Raffle.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
          },
          {
            model: User,
            as: "User",
            attributes: ["id", "pubkey"],
            include: [
              {
                model: UserInfo,
                as: "UserInfo",
                attributes: ["username", "email"],
              },
            ],
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

  /**
   * Toggle raffle featured status (admin)
   * PUT /raffle/admin/:id/featured
   */
  static async toggleFeaturedStatus(req, res) {
    try {
      // TODO: Add admin authentication check
      const userId = req.payload?.id;
      const { id } = req.params;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      const { isFeatured, featuredPosition, featuredUntil } = req.body;

      const raffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      if (!raffle.RaffleDetail) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle details not found");
      }

      // Update featured status
      raffle.RaffleDetail.isFeatured = isFeatured;
      if (featuredPosition !== undefined) {
        raffle.RaffleDetail.featuredPosition = featuredPosition;
      }
      if (featuredUntil !== undefined) {
        raffle.RaffleDetail.featuredUntil = featuredUntil;
      }

      await raffle.RaffleDetail.save();

      return respond(res, httpStatus.OK, "Featured status updated successfully", {
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

  /**
   * Toggle raffle status: suspend/resume (admin)
   * PUT /raffle/admin/:id/suspend
   */
  static async toggleSuspendStatus(req, res) {
    try {
      // TODO: Add admin authentication check
      const userId = req.payload?.id;
      const { id } = req.params;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      const { suspend } = req.body;

      const raffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
            as: "RaffleDetail",
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      // Use additionalJson to store suspension status
      const currentJson = raffle.RaffleDetail?.additionalJson || {};
      const updatedJson = {
        ...currentJson,
        suspended: suspend,
        suspendedAt: suspend ? new Date() : null,
      };

      if (raffle.RaffleDetail) {
        raffle.RaffleDetail.additionalJson = updatedJson;
        await raffle.RaffleDetail.save();
      }

      return respond(
        res,
        httpStatus.OK,
        suspend ? "Raffle suspended successfully" : "Raffle resumed successfully",
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
}

module.exports = RaffleController;