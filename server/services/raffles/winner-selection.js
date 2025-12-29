const { Raffle, RaffleTicket, RaffleReward, User } = require("../../models");
const { RAFFLE_STATUS } = require("../../config/data");
const logger = require("../../util/logger");
const crypto = require("crypto");

class WinnerSelectionService {
  /**
   * Select winners for a raffle that has ended
   * @param {number} raffleId - The raffle ID
   * @returns {Promise<Object>} - Result of winner selection
   */
  static async selectWinners(raffleId) {
    try {
      const raffle = await Raffle.findOne({
        where: { id: raffleId },
        include: [
          {
            model: RaffleTicket,
            include: [
              {
                model: User,
                attributes: ["id", "pubkey"],
              },
            ],
          },
          {
            model: RaffleReward,
          },
        ],
      });

      if (!raffle) {
        throw new Error("Raffle not found");
      }

      if (raffle.status !== RAFFLE_STATUS.ENDED) {
        throw new Error("Raffle must be ended before selecting winners");
      }

      if (raffle.winnersSelected) {
        throw new Error("Winners have already been selected for this raffle");
      }

      const tickets = raffle.raffle_tickets || [];
      const rewards = raffle.raffle_rewards || [];

      if (tickets.length === 0) {
        throw new Error("No tickets sold for this raffle");
      }

      if (rewards.length === 0) {
        throw new Error("No rewards configured for this raffle");
      }

      // Generate a random seed for reproducible winner selection
      const seed = crypto.randomBytes(32).toString("hex");
      
      // Create a seeded random number generator
      const seedBuffer = Buffer.from(seed, "hex");
      let seedIndex = 0;
      
      const seededRandom = () => {
        if (seedIndex >= seedBuffer.length - 4) {
          seedIndex = 0;
        }
        const value = seedBuffer.readUInt32BE(seedIndex);
        seedIndex += 4;
        return value / 0xffffffff;
      };

      // Select unique winners
      const selectedTickets = [];
      const availableTickets = [...tickets];
      const numberOfWinners = Math.min(raffle.numberOfWinners, rewards.length, tickets.length);

      for (let i = 0; i < numberOfWinners; i++) {
        if (availableTickets.length === 0) break;

        const randomIndex = Math.floor(seededRandom() * availableTickets.length);
        const selectedTicket = availableTickets.splice(randomIndex, 1)[0];
        selectedTickets.push(selectedTicket);
      }

      // Assign rewards to winners
      const winnerAssignments = [];
      for (let i = 0; i < selectedTickets.length && i < rewards.length; i++) {
        const ticket = selectedTickets[i];
        const reward = rewards[i];

        // Update the ticket as winner
        await RaffleTicket.update(
          { isWinner: true },
          { where: { id: ticket.id } }
        );

        // Update the reward with winner information
        await RaffleReward.update(
          {
            winnerId: ticket.userId,
            winnerTicketId: ticket.id,
          },
          { where: { id: reward.id } }
        );

        winnerAssignments.push({
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          userId: ticket.userId,
          userPubkey: ticket.User?.pubkey,
          rewardId: reward.id,
          rewardName: reward.rewardName,
          rewardType: reward.rewardType,
          mintAddress: reward.mintAddress,
          amount: reward.amount,
        });

        logger.info(
          `Winner selected: User ${ticket.userId} (${ticket.User?.pubkey}) won reward ${reward.rewardName} with ticket #${ticket.ticketNumber}`
        );
      }

      // Update raffle with winner selection information
      await Raffle.update(
        {
          winnersSelected: true,
          winnersSelectedAt: new Date(),
          winnerSelectionSeed: seed,
        },
        { where: { id: raffleId } }
      );

      logger.info(
        `Winners selected for raffle ${raffleId}: ${winnerAssignments.length} winners selected`
      );

      return {
        success: true,
        raffleId,
        numberOfWinners: winnerAssignments.length,
        winners: winnerAssignments,
        selectionSeed: seed,
        selectedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Error selecting winners for raffle ${raffleId}:`, error);
      throw error;
    }
  }

  /**
   * Get winners for a raffle
   * @param {number} raffleId - The raffle ID
   * @returns {Promise<Array>} - List of winners
   */
  static async getWinners(raffleId) {
    try {
      const winners = await RaffleReward.findAll({
        where: {
          raffleId,
          winnerId: { [require("sequelize").Op.ne]: null },
        },
        include: [
          {
            model: User,
            as: "winner",
            attributes: ["id", "pubkey"],
          },
          {
            model: RaffleTicket,
            as: "winnerTicket",
            attributes: ["id", "ticketNumber"],
          },
        ],
      });

      return winners.map((winner) => ({
        rewardId: winner.id,
        rewardName: winner.rewardName,
        rewardType: winner.rewardType,
        mintAddress: winner.mintAddress,
        amount: winner.amount,
        imageUrl: winner.imageUrl,
        winnerId: winner.winnerId,
        winnerPubkey: winner.winner?.pubkey,
        ticketId: winner.winnerTicketId,
        ticketNumber: winner.winnerTicket?.ticketNumber,
        isClaimed: winner.isClaimed,
        claimedAt: null, // Will be fetched from claimTransaction if needed
      }));
    } catch (error) {
      logger.error(`Error getting winners for raffle ${raffleId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a user is a winner of a specific raffle
   * @param {number} raffleId - The raffle ID
   * @param {number} userId - The user ID
   * @returns {Promise<boolean>} - True if user is a winner
   */
  static async isUserWinner(raffleId, userId) {
    try {
      const winnerReward = await RaffleReward.findOne({
        where: {
          raffleId,
          winnerId: userId,
        },
      });

      return !!winnerReward;
    } catch (error) {
      logger.error(
        `Error checking if user ${userId} is winner of raffle ${raffleId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get all wins for a user across all raffles
   * @param {number} userId - The user ID
   * @returns {Promise<Array>} - List of user's wins
   */
  static async getUserWins(userId) {
    try {
      const wins = await RaffleReward.findAll({
        where: {
          winnerId: userId,
        },
        include: [
          {
            model: Raffle,
            attributes: ["id", "title", "imageUrl", "endedAt"],
          },
          {
            model: RaffleTicket,
            as: "winnerTicket",
            attributes: ["id", "ticketNumber"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return wins.map((win) => ({
        rewardId: win.id,
        rewardName: win.rewardName,
        rewardType: win.rewardType,
        mintAddress: win.mintAddress,
        amount: win.amount,
        imageUrl: win.imageUrl,
        isClaimed: win.isClaimed,
        claimedAt: null, // Will be fetched from claimTransaction if needed
        ticketNumber: win.winnerTicket?.ticketNumber,
        raffle: {
          id: win.Raffle?.id,
          title: win.Raffle?.title,
          imageUrl: win.Raffle?.imageUrl,
          endedAt: win.Raffle?.endedAt,
        },
      }));
    } catch (error) {
      logger.error(`Error getting wins for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = WinnerSelectionService;