const { XpTable, XpConfig, User, VerifiedToken } = require("../models");
const { SPL_TOKEN_ADDRESS } = require("../config/data");
const logger = require("../util/logger");
const redisClient = require("../util/redisClient");
const PriceService = require("./price.service");

class XpService {
  /**
   * Get current XP rates from configuration
   * @returns {Promise<Object>} XP rates configuration
   */
  static async getXpRates() {
    try {
      const cacheKey = "xp:rates";
      
      // Try to get from cache first (only if Redis is available)
      try {
        const cachedRates = await redisClient.get(cacheKey);
        if (cachedRates) {
          return cachedRates;
        }
      } catch (redisError) {
        logger.warn(`Redis cache unavailable for XP rates: ${redisError.message}`);
      }

      // Get from database
      let rates = await XpConfig.getAllActiveConfig();
      
      // If no rates found, initialize with defaults
      if (!rates || Object.keys(rates).length === 0) {
        logger.info("No XP rates found in database, initializing with defaults");
        await this.initializeDefaultXpRates();
        rates = await XpConfig.getAllActiveConfig();
      }

      // Ensure all required rates exist
      const defaultRates = {
        ticket_purchase_rate: 1,
        raffle_revenue_rate: 1,
        raffle_creation_reward: 10
      };

      const finalRates = { ...defaultRates, ...rates };
      
      // Cache for 5 minutes (only if Redis is available)
      try {
        await redisClient.set(cacheKey, finalRates, 300);
      } catch (redisError) {
        logger.warn(`Could not cache XP rates: ${redisError.message}`);
      }
      
      return finalRates;
    } catch (error) {
      logger.error(`Error getting XP rates: ${error.message}`);
      // Return default rates if database fails
      return {
        ticket_purchase_rate: 1,
        raffle_revenue_rate: 1,
        raffle_creation_reward: 10
      };
    }
  }

  /**
   * Initialize default XP rates in the database
   * @returns {Promise<void>}
   */
  static async initializeDefaultXpRates() {
    try {
      const defaultConfigs = [
        {
          configKey: 'ticket_purchase_rate',
          configValue: 1,
          description: 'XP earned per $1 spent on ticket purchases'
        },
        {
          configKey: 'raffle_revenue_rate',
          configValue: 1,
          description: 'XP earned per $1 revenue generated from raffles'
        },
        {
          configKey: 'raffle_creation_reward',
          configValue: 10,
          description: 'Fixed XP reward for creating a raffle'
        }
      ];

      for (const config of defaultConfigs) {
        await XpConfig.updateConfigValue(config.configKey, config.configValue);
        logger.info(`Initialized XP config: ${config.configKey} = ${config.configValue}`);
      }

    } catch (error) {
      logger.error(`Error initializing default XP rates: ${error.message}`);
    }
  }

  /**
   * Convert token amount to USD using existing token pricing logic
   * @param {number} tokenType - Token type from TOKEN_TYPE enum
   * @param {string} tokenAddress - Token mint address
   * @param {number} amount - Token amount
   * @returns {Promise<number>} USD equivalent value
   */
  static async convertToUsd(tokenType, tokenAddress, amount, decimals = 9) {
    try {
      // Convert raw amount to actual token amount using decimals
      const actualTokenAmount = parseFloat(amount) / Math.pow(10, decimals);
      
      logger.info(`Converting token amount: raw=${amount}, decimals=${decimals}, actual=${actualTokenAmount}`);

      // Get token symbol for better logging
      let tokenSymbol = 'Unknown';
      try {
        const token = await VerifiedToken.findOne({
          where: { address: tokenAddress },
          attributes: ['symbol', 'name']
        });
        tokenSymbol = token ? (token.symbol || token.name || 'Unknown') : 'Unknown';
      } catch (error) {
        // Continue with 'Unknown' symbol
      }

      // Get real-time USD price using PriceService
      const realTimePrice = await PriceService.getTokenUsdPrice(tokenAddress, tokenSymbol);
      
      if (realTimePrice <= 0) {
        logger.warn(`No valid price found for ${tokenSymbol} (${tokenAddress}), USD value = 0`);
        return 0;
      }

      const usdValue = actualTokenAmount * realTimePrice;
      logger.info(`Converted ${actualTokenAmount} ${tokenSymbol} to $${usdValue} USD using real-time rate $${realTimePrice}`);
      
      return usdValue;

      if (token && token.conversionRate) {
        const usdValue = actualTokenAmount * parseFloat(token.conversionRate);
        logger.info(`Converted ${amount} ${token.symbol || tokenAddress} to $${usdValue} USD using rate ${token.conversionRate}`);
        return usdValue;
      }

      // For SOL, we could integrate with external price API
      if (tokenType === TOKEN_TYPE.SOLANA || tokenAddress === SPL_TOKEN_ADDRESS.SOLANA) {
        // For now, use a placeholder rate - in production, integrate with price API
        const solRate = await this.fetchSolPrice();
        const usdValue = actualTokenAmount * solRate;
        logger.info(`Converted ${amount} SOL to $${usdValue} USD using rate ${solRate}`);
        return usdValue;
      }

      // Fallback: if no conversion rate available, return 0
      logger.warn(`No conversion rate found for token ${tokenAddress}, type ${tokenType}`);
      return 0;

    } catch (error) {
      logger.error(`Error converting token to USD: ${error.message}`);
      return 0;
    }
  }

  /**
   * Award XP for ticket purchases
   * @param {number} userId - User ID
   * @param {number} splTokenSendTransactionId - Transaction ID
   * @param {number} usdValue - USD value of purchase
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object|null>} XP record or null if duplicate
   */
  static async awardTicketPurchaseXp(userId, splTokenSendTransactionId, usdValue, metadata = {}) {
    try {
      logger.info(`Attempting to award ticket purchase XP: userId=${userId}, transactionId=${splTokenSendTransactionId}, usdValue=${usdValue}`);
      
      const rates = await this.getXpRates();
      const xpEarned = usdValue * (rates.ticket_purchase_rate || 1);

      const config = await XpConfig.findOne({
        where: { configKey: 'ticket_purchase_rate', isActive: true }
      });

      // Check for duplicate transaction
      const existing = await XpTable.findOne({
        where: { 
          splTokenSendTransactionId
        }
      });

      if (existing) {
        logger.info(`XP already awarded for transaction ${splTokenSendTransactionId}`);
        return null;
      }

      logger.info(`Creating ticket purchase XP record: userId=${userId}, transactionId=${splTokenSendTransactionId}, xpEarned=${xpEarned}`);

      const xpRecord = await XpTable.create({
        userId,
        splTokenSendTransactionId,
        raffleId: metadata.raffleId,
        configId: config?.id,
        usdValue,
        xpEarned,
        tokenType: metadata.tokenType,
        tokenAddress: metadata.tokenAddress,
        rawTokenAmount: metadata.rawTokenAmount,
        conversionRate: metadata.conversionRate,
        metadata
      });

      logger.info(`Ticket purchase XP record created successfully with ID: ${xpRecord.id}`);

      await this.updateUserTotalXp(userId);
      
      logger.info(`Awarded ${xpEarned} XP to user ${userId} for ticket purchase (transaction ${splTokenSendTransactionId})`);
      return xpRecord;

    } catch (error) {
      logger.error(`Error awarding ticket purchase XP: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Award XP for raffle revenue
   * @param {number} userId - User ID
   * @param {number} raffleId - Raffle ID
   * @param {number} usdRevenue - USD revenue amount
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} XP record
   */
  static async awardRaffleRevenueXp(userId, raffleId, usdRevenue, metadata = {}) {
    try {
      const rates = await this.getXpRates();
      const xpEarned = usdRevenue * (rates.raffle_revenue_rate || 1);

      const config = await XpConfig.findOne({
        where: { configKey: 'raffle_revenue_rate', isActive: true }
      });

      // Check for duplicate
      const existing = await XpTable.findOne({
        where: { 
          userId,
          raffleId,
          configId: config?.id
        }
      });

      if (existing) {
        logger.info(`Revenue XP already awarded for raffle ${raffleId}`);
        return existing;
      }

      const xpRecord = await XpTable.create({
        userId,
        raffleId,
        configId: config?.id,
        usdValue: usdRevenue,
        xpEarned,
        metadata
      });

      await this.updateUserTotalXp(userId);
      
      logger.info(`Awarded ${xpEarned} XP to user ${userId} for raffle revenue (raffle ${raffleId})`);
      return xpRecord;

    } catch (error) {
      logger.error(`Error awarding raffle revenue XP: ${error.message}`);
      throw error;
    }
  }

  /**
   * Award XP for raffle creation
   * @param {number} userId - User ID
   * @param {number} raffleId - Raffle ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} XP record
   */
  static async awardRaffleCreationXp(userId, raffleId, metadata = {}) {
    try {
      logger.info(`Attempting to award raffle creation XP: userId=${userId}, raffleId=${raffleId}`);
      
      const rates = await this.getXpRates();
      const xpEarned = rates.raffle_creation_reward || 10;

      const config = await XpConfig.findOne({
        where: { configKey: 'raffle_creation_reward', isActive: true }
      });

      // Check for duplicate
      const existing = await XpTable.findOne({
        where: { 
          userId,
          raffleId,
          configId: config?.id
        }
      });

      if (existing) {
        logger.info(`Creation XP already awarded for raffle ${raffleId}`);
        return existing;
      }

      logger.info(`Creating XP record: userId=${userId}, raffleId=${raffleId}, xpEarned=${xpEarned}`);

      const xpRecord = await XpTable.create({
        userId,
        raffleId,
        configId: config?.id,
        usdValue: 0, // Fixed reward, not based on USD value
        xpEarned,
        metadata
      });

      logger.info(`XP record created successfully with ID: ${xpRecord.id}`);

      await this.updateUserTotalXp(userId);
      
      logger.info(`Awarded ${xpEarned} XP to user ${userId} for raffle creation (raffle ${raffleId})`);
      return xpRecord;

    } catch (error) {
      logger.error(`Error awarding raffle creation XP: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Update user's total XP
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async updateUserTotalXp(userId) {
    try {
      const totalXp = await XpTable.sum('xpEarned', { where: { userId } });
      
      await User.update(
        { 
          totalXp: totalXp || 0, 
          xpLastUpdated: new Date() 
        },
        { where: { id: userId } }
      );

      // Clear user XP cache (only if Redis is available)
      try {
        await redisClient.del(`user:${userId}:xp`);
      } catch (redisError) {
        logger.warn(`Could not clear XP cache for user ${userId}: ${redisError.message}`);
      }
      
      logger.debug(`Updated total XP for user ${userId}: ${totalXp || 0}`);

    } catch (error) {
      logger.error(`Error updating user total XP: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's XP summary with caching
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User XP summary
   */
  static async getUserXpSummary(userId) {
    try {
      const cacheKey = `user:${userId}:xp`;
      
      // Try cache first (only if Redis is available)
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return cached;
        }
      } catch (redisError) {
        logger.warn(`Redis cache unavailable for user XP summary: ${redisError.message}`);
      }

      const user = await User.findByPk(userId, {
        attributes: ['id', 'pubkey', 'totalXp', 'xpLastUpdated']
      });

      if (!user) {
        throw new Error('User not found');
      }

      const breakdown = await XpTable.findAll({
        where: { userId },
        include: [{
          model: XpConfig,
          as: 'config',
          attributes: ['configKey', 'description'],
          required: false
        }],
        attributes: [
          [XpTable.sequelize.fn('COUNT', XpTable.sequelize.col('XpTable.id')), 'count'],
          [XpTable.sequelize.fn('SUM', XpTable.sequelize.col('xpEarned')), 'totalXp']
        ],
        group: ['config.id'],
        raw: false
      });

      const summary = {
        user,
        breakdown,
        totalXp: parseFloat(user.totalXp || 0)
      };

      // Cache for 2 minutes (only if Redis is available)
      try {
        await redisClient.set(cacheKey, summary, 120);
      } catch (redisError) {
        logger.warn(`Could not cache user XP summary: ${redisError.message}`);
      }

      return summary;

    } catch (error) {
      logger.error(`Error getting user XP summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process transaction for XP award
   * @param {Object} transaction - SplTokenSendTransaction record
   * @returns {Promise<void>}
   */
  static async processTransactionXp(transaction) {
    try {
      // Only process successful transactions
      if (transaction.status !== 2) { // SUCCESS status
        return;
      }

      // Skip if already processed
      if (transaction.xpProcessed) {
        return;
      }

      // Determine transaction type and award appropriate XP
      if (transaction.rewardTransferType === 'ticket_purchase' || 
          (!transaction.rewardTransferType && transaction.raffleId)) {
        
        // Find user ID from raffle ticket or other means
        const userId = await this.getUserIdFromTransaction(transaction);
        if (!userId) {
          logger.warn(`Could not determine user ID for transaction ${transaction.id}`);
          return;
        }

        const usdValue = await this.convertToUsd(
          transaction.type, // Using type as tokenType
          transaction.tokenAddress,
          parseFloat(transaction.uiAmount),
          transaction.decimals || 9
        );

        if (usdValue > 0) {
          await this.awardTicketPurchaseXp(userId, transaction.id, usdValue, {
            raffleId: transaction.raffleId,
            tokenType: transaction.type,
            tokenAddress: transaction.tokenAddress,
            rawTokenAmount: parseFloat(transaction.uiAmount),
            conversionRate: usdValue / parseFloat(transaction.uiAmount),
            transactionHash: transaction.txId
          });
        }
      }

    } catch (error) {
      logger.error(`Error processing transaction XP for transaction ${transaction.id}: ${error.message}`);
    }
  }

  /**
   * Helper method to get user ID from transaction
   * @param {Object} transaction - Transaction record
   * @returns {Promise<number|null>} User ID
   */
  static async getUserIdFromTransaction(transaction) {
    try {
      // If we have raffleId, we can get the user from raffle tickets
      if (transaction.raffleId) {
        const raffle = await Raffle.findByPk(transaction.raffleId, {
          attributes: ['userId']
        });
        return raffle ? raffle.userId : null;
      }

      // Could implement other logic to determine user from transaction
      return null;

    } catch (error) {
      logger.error(`Error getting user ID from transaction: ${error.message}`);
      return null;
    }
  }
}

module.exports = XpService;