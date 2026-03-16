const { Op } = require("sequelize");
const {
  SplTokenSendTransaction,
  Raffle,
  User,
  XpTable,
  VerifiedToken,
} = require("../models");
const { SPL_TOKEN_SEND_TX_STATUS, RAFFLE_STATUS } = require("../config/data");
const XpService = require("./xp.service");
const logger = require("../util/logger");

class XpProcessor {
  /**
   * Process pending XP awards for successful transactions
   * Runs every minute to catch newly confirmed transactions
   */
  static async processPendingXp() {
    try {
      logger.info("Starting XP processing for pending transactions");

      // Find successful transactions that haven't been processed for XP
      const pendingTransactions = await SplTokenSendTransaction.findAll({
        where: {
          status: SPL_TOKEN_SEND_TX_STATUS.SUCCESS,
          [Op.or]: [
            { xpProcessed: { [Op.ne]: true } },
            { xpProcessed: { [Op.is]: null } },
            { xpProcessed: false },
          ],
        },
        include: [
          {
            model: Raffle,
            as: "raffle",
            attributes: ["id", "userId", "title", "tokenType", "tokenAddress"],
            required: false, // Allow transactions without raffles
          },
        ],
        limit: 50,
        order: [["createdAt", "ASC"]],
      });

      logger.info(
        `Found ${pendingTransactions.length} pending transactions to process for XP`
      );

      let processedCount = 0;
      let errorCount = 0;

      for (const transaction of pendingTransactions) {
        try {
          await this.processTransactionXp(transaction);

          // Mark as processed
          await transaction.update({ xpProcessed: true });
          processedCount++;
        } catch (error) {
          logger.error(
            `Error processing XP for transaction ${transaction.id}: ${error.message}`
          );
          errorCount++;

          // Still mark as processed to avoid infinite retries
          await transaction.update({ xpProcessed: true });
        }
      }

      // Process ended raffles for revenue XP
      await this.processRaffleRevenueXp();

      logger.info(
        `XP processing completed: ${processedCount} processed, ${errorCount} errors`
      );
    } catch (error) {
      logger.error("XP processing error:", error);
    }
  }

  /**
   * Process individual transaction for XP
   * @param {Object} transaction - SplTokenSendTransaction with Raffle included
   */
  static async processTransactionXp(transaction) {
    try {
      logger.info(
        `Processing transaction ${transaction.id} for XP - Type: ${transaction.rewardTransferType}, RaffleId: ${transaction.raffleId}`
      );

      // Handle raffle creation XP
      if (
        transaction.rewardTransferType === "raffle_creation" &&
        transaction.raffleId
      ) {
        await this.processRaffleCreationXpFromTransaction(transaction);
        return;
      }

      // Handle ticket purchase XP
      if (this.isTicketPurchaseTransaction(transaction)) {
        const raffle = transaction.raffle;
        if (!raffle) {
          // Try to find raffle by ID if not included
          const foundRaffle = await Raffle.findByPk(transaction.raffleId);
          if (foundRaffle) {
            transaction.raffle = foundRaffle;
            await this.processTicketPurchaseXp(transaction, foundRaffle);
          } else {
            logger.warn(
              `No raffle found for transaction ${transaction.id} with raffleId ${transaction.raffleId}`
            );
          }
        } else {
          await this.processTicketPurchaseXp(transaction, raffle);
        }
        return;
      }

      logger.info(
        `Transaction ${transaction.id} does not qualify for XP processing`
      );
    } catch (error) {
      logger.error(
        `Error processing transaction ${transaction.id} for XP: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Check if transaction is a ticket purchase
   * @param {Object} transaction - Transaction record
   * @returns {boolean}
   */
  static isTicketPurchaseTransaction(transaction) {
    // Check if this is a ticket purchase based on transaction properties
    return (
      transaction.rewardTransferType === "ticket_purchase" ||
      // For transactions without explicit rewardTransferType, check if it has raffleId and receiverPubkey
      // and is NOT a raffle_creation transaction
      (!transaction.rewardTransferType &&
        transaction.raffleId &&
        transaction.receiverPubkey &&
        transaction.rewardTransferType !== "raffle_creation")
    );
  }

  /**
   * Process ticket purchase XP
   * @param {Object} transaction - Transaction record
   * @param {Object} raffle - Raffle record
   */
  static async processTicketPurchaseXp(transaction, raffle) {
    try {
      // Find the user who made the purchase
      // In ticket purchases, the sender is the user buying tickets
      const user = await User.findOne({
        where: { pubkey: transaction.senderPubkey },
      });

      if (!user) {
        logger.warn(
          `User not found for pubkey ${transaction.senderPubkey} in transaction ${transaction.id}`
        );
        return;
      }

      // Convert transaction amount to USD
      const usdValue = await XpService.convertToUsd(
        raffle.tokenType,
        raffle.tokenAddress,
        parseFloat(transaction.uiAmount),
        transaction.decimals || 9
      );

      if (usdValue <= 0) {
        logger.warn(
          `Invalid USD value ${usdValue} for transaction ${transaction.id}`
        );
        return;
      }

      // Award XP for ticket purchase
      await XpService.awardTicketPurchaseXp(user.id, transaction.id, usdValue, {
        raffleId: raffle.id,
        raffleTitle: raffle.title,
        tokenType: raffle.tokenType,
        tokenAddress: raffle.tokenAddress,
        rawTokenAmount: parseFloat(transaction.uiAmount),
        conversionRate:
          (usdValue / parseFloat(transaction.uiAmount)) *
          Math.pow(10, transaction.decimals),
        transactionHash: transaction.txId,
        ticketCount: transaction.additionalJson?.ticketCount || 1,
      });
    } catch (error) {
      logger.error(
        `Error processing ticket purchase XP for transaction ${transaction.id}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Process ended raffles for revenue XP
   */
  static async processRaffleRevenueXp() {
    try {
      // Find ended raffles that haven't awarded revenue XP
      const endedRaffles = await Raffle.findAll({
        where: {
          status: RAFFLE_STATUS.ENDED,
          [Op.or]: [
            { xpAwarded: { [Op.ne]: true } },
            { xpAwarded: { [Op.is]: null } },
            { xpAwarded: false },
          ],
          // Use totalRevenue instead of claimableAmount for filtering
          totalRevenue: { [Op.gt]: 0 },
        },
        limit: 20,
        order: [["endedAt", "ASC"]],
      });

      logger.info(
        `Found ${endedRaffles.length} ended raffles to process for revenue XP`
      );

      for (const raffle of endedRaffles) {
        try {
          await this.processRaffleRevenue(raffle);

          // Mark as XP awarded
          await raffle.update({ xpAwarded: true });
        } catch (error) {
          logger.error(
            `Error processing revenue XP for raffle ${raffle.id}: ${error.message}`
          );

          // Still mark as processed to avoid infinite retries
          await raffle.update({ xpAwarded: true });
        }
      }
    } catch (error) {
      logger.error("Error processing raffle revenue XP:", error);
    }
  }

  /**
   * Process individual raffle for revenue XP
   * @param {Object} raffle - Raffle record
   */
  static async processRaffleRevenue(raffle) {
    try {
      logger.info(
        `Processing raffle ${raffle.id} for revenue XP - totalRevenue: ${raffle.totalRevenue}, claimableAmount: ${raffle.claimableAmount}`
      );

      // For raffle revenue, we need to look up token decimals from verified_tokens
      const token = await VerifiedToken.findOne({
        where: { address: raffle.tokenAddress },
      });
      const decimals = token ? token.decimals : 9;

      const revenueAmount = parseFloat(raffle.totalRevenue || 0);

      if (revenueAmount <= 0) {
        logger.warn(
          `No revenue to process for raffle ${raffle.id} - totalRevenue: ${raffle.totalRevenue}`
        );
        return;
      }

      const usdRevenue = await XpService.convertToUsd(
        raffle.tokenType,
        raffle.tokenAddress,
        revenueAmount,
        0 // decimals = 0 since totalRevenue is already converted
      );

      if (usdRevenue <= 0) {
        logger.warn(
          `Invalid USD revenue ${usdRevenue} for raffle ${raffle.id} (totalRevenue: ${revenueAmount})`
        );
        return;
      }

      logger.info(
        `Calculated USD revenue: ${usdRevenue} for raffle ${raffle.id}`
      );

      // Award revenue XP to raffle creator
      await XpService.awardRaffleRevenueXp(
        raffle.userId,
        raffle.id,
        usdRevenue,
        {
          raffleTitle: raffle.title,
          ticketsSold: raffle.ticketsSold,
          totalRevenue: parseFloat(raffle.totalRevenue),
          claimableAmount: parseFloat(raffle.claimableAmount),
          tokenType: raffle.tokenType,
          tokenAddress: raffle.tokenAddress,
        }
      );
    } catch (error) {
      logger.error(
        `Error processing revenue for raffle ${raffle.id}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Recalculate user XP totals (runs daily)
   * This ensures data integrity and fixes any discrepancies
   */
  static async recalculateUserXp() {
    try {
      logger.info("Starting daily XP recalculation for all users");

      // Get all users who have XP records
      const usersWithXp = await XpTable.findAll({
        attributes: ["userId"],
        group: ["userId"],
        raw: true,
      });

      logger.info(`Recalculating XP for ${usersWithXp.length} users`);

      let processedCount = 0;
      let errorCount = 0;

      for (const userRecord of usersWithXp) {
        try {
          await XpService.updateUserTotalXp(userRecord.userId);
          processedCount++;
        } catch (error) {
          logger.error(
            `Error recalculating XP for user ${userRecord.userId}: ${error.message}`
          );
          errorCount++;
        }
      }

      logger.info(
        `XP recalculation completed: ${processedCount} users processed, ${errorCount} errors`
      );
    } catch (error) {
      logger.error("Error in XP recalculation:", error);
    }
  }

  /**
   * Process raffle creation XP from transaction
   * @param {Object} transaction - Transaction record
   */
  static async processRaffleCreationXpFromTransaction(transaction) {
    try {
      const raffle = await Raffle.findByPk(transaction.raffleId);
      if (!raffle) {
        logger.warn(
          `Raffle ${transaction.raffleId} not found for creation XP from transaction ${transaction.id}`
        );
        return;
      }

      // Award creation XP
      await XpService.awardRaffleCreationXp(raffle.userId, raffle.id, {
        raffleTitle: raffle.title,
        totalTickets: raffle.totalTickets,
        ticketPrice: parseFloat(raffle.ticketPrice),
        tokenType: raffle.tokenType,
        tokenAddress: raffle.tokenAddress,
        transactionId: transaction.id,
        transactionHash: transaction.txId,
      });

      logger.info(
        `Awarded raffle creation XP for raffle ${raffle.id} from transaction ${transaction.id}`
      );
    } catch (error) {
      logger.error(
        `Error processing creation XP from transaction ${transaction.id}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Process raffle creation XP when raffle transitions from DRAFT to active status
   * @param {number} raffleId - Raffle ID
   */
  static async processRaffleCreationXp(raffleId) {
    try {
      const raffle = await Raffle.findByPk(raffleId);
      if (!raffle) {
        logger.warn(`Raffle ${raffleId} not found for creation XP`);
        return;
      }

      // Award creation XP
      await XpService.awardRaffleCreationXp(raffle.userId, raffle.id, {
        raffleTitle: raffle.title,
        totalTickets: raffle.totalTickets,
        ticketPrice: parseFloat(raffle.ticketPrice),
        tokenType: raffle.tokenType,
        tokenAddress: raffle.tokenAddress,
      });
    } catch (error) {
      logger.error(
        `Error processing creation XP for raffle ${raffleId}: ${error.message}`
      );
    }
  }

  /**
   * Get XP processing statistics
   * @returns {Promise<Object>} Processing statistics
   */
  static async getProcessingStats() {
    try {
      const pendingTransactions = await SplTokenSendTransaction.count({
        where: {
          status: SPL_TOKEN_SEND_TX_STATUS.SUCCESS,
          [Op.or]: [
            { xpProcessed: { [Op.ne]: true } },
            { xpProcessed: { [Op.is]: null } },
            { xpProcessed: false },
          ],
        },
      });

      const pendingRaffles = await Raffle.count({
        where: {
          status: RAFFLE_STATUS.ENDED,
          [Op.or]: [
            { xpAwarded: { [Op.ne]: true } },
            { xpAwarded: { [Op.is]: null } },
            { xpAwarded: false },
          ],
          claimableAmount: { [Op.gt]: 0 },
        },
      });

      const totalXpRecords = await XpTable.count();
      const totalXpAwarded = await XpTable.sum("xpEarned");

      return {
        pendingTransactions,
        pendingRaffles,
        totalXpRecords,
        totalXpAwarded: parseFloat(totalXpAwarded || 0),
      };
    } catch (error) {
      logger.error("Error getting XP processing stats:", error);
      return {
        pendingTransactions: 0,
        pendingRaffles: 0,
        totalXpRecords: 0,
        totalXpAwarded: 0,
      };
    }
  }
}

module.exports = XpProcessor;
