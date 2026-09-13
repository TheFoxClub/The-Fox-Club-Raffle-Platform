const { sequelize } = require("../models");
const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const {
  SPL_TOKEN_SEND_TX_STATUS,
  TOKEN_TYPE,
  mapEnumValue,
} = require("../config/data");
const PriceService = require("../services/price.service");

const getTicketPayments = async (startDate, endDate) => {
  const rows = await sequelize.query(
    `
      SELECT
        st.id, st.createdAt, st.senderPubkey, st.type, st.tokenAddress,
        st.decimals, st.uiAmount, st.commissionAmount,
        COUNT(rt.id) AS ticketsSold,
        SUM(CASE WHEN rt.isWinner = 1 THEN 1 ELSE 0 END) AS winnersCount
      FROM spl_token_send_transactions st
      LEFT JOIN raffle_tickets rt ON rt.splTokenSendTxId = st.id
      WHERE st.status = ?
        AND st.rewardTransferType = 'ticket_purchase'
        AND st.createdAt BETWEEN ? AND ?
      GROUP BY st.id
      ORDER BY st.createdAt ASC
    `,
    {
      replacements: [SPL_TOKEN_SEND_TX_STATUS.SUCCESS, startDate, endDate],
      type: sequelize.QueryTypes.SELECT,
    },
  );

  return Promise.all(rows.map(async (payment) => {
    const decimals = Number(payment.decimals) || 9;
    const price = await PriceService.getTokenUsdPrice(payment.tokenAddress);
    const totalAmount = Number(payment.uiAmount || 0) / Math.pow(10, decimals);
    const commissionAmount = Number(payment.commissionAmount || 0);
    return {
      ...payment,
      totalUsd: totalAmount * price,
      commissionUsd: commissionAmount * price,
      creatorUsd: (totalAmount - commissionAmount) * price,
    };
  }));
};

// Total Users
const getTotalUsers = async () => {
  try {
    const result = await sequelize.query(
      `SELECT COUNT(*) as totalUsers FROM users`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return parseInt(result[0]?.totalUsers || 0, 10);
  } catch (error) {
    logger.error("Error getting total users:", error);
    return 0;
  }
};

// Active Users (users who bought tickets in the period)
const getActiveUsers = async (startDate, endDate) => {
  try {
    const result = await sequelize.query(
      `
      SELECT COUNT(DISTINCT st.senderPubkey) as activeUsers
      FROM spl_token_send_transactions st
      INNER JOIN raffle_tickets rt ON rt.splTokenSendTxId = st.id
      WHERE st.status = ?
        AND st.createdAt BETWEEN ? AND ?
      `,
      {
        replacements: [SPL_TOKEN_SEND_TX_STATUS.SUCCESS, startDate, endDate],
        type: sequelize.QueryTypes.SELECT,
      }
    );
    return parseInt(result[0]?.activeUsers || 0, 10);
  } catch (error) {
    logger.error("Error getting active users:", error);
    return 0;
  }
};

// Average Ticket Price
const getAverageTicketPrice = async (startDate, endDate) => {
  try {
    const rows = await sequelize.query(
      `
      SELECT
        st.id,
        st.tokenAddress,
        (COALESCE(st.commissionAmount,0) + COALESCE(st.creatorAmount,0)) AS transactionAmount,
        COUNT(rt.id) AS ticketsCount
      FROM spl_token_send_transactions st
      INNER JOIN raffle_tickets rt
        ON rt.splTokenSendTxId = st.id
      WHERE st.status = ?
        AND st.createdAt BETWEEN ? AND ?
      GROUP BY st.id
      `,
      {
        replacements: [SPL_TOKEN_SEND_TX_STATUS.SUCCESS, startDate, endDate],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!rows.length) {
      return { average: 0, totalTickets: 0 };
    }

    let totalUsd = 0;
    let totalTickets = 0;

    for (const row of rows) {
      const tokenPrice = await PriceService.getTokenUsdPrice(row.tokenAddress);

      const txAmount = parseFloat(row.transactionAmount || 0);
      const tickets = parseInt(row.ticketsCount || 0, 10);

      if (tickets === 0) continue;

      const ticketPrice = txAmount / tickets;
      const ticketPriceUsd = ticketPrice * tokenPrice;

      totalUsd += ticketPriceUsd * tickets;
      totalTickets += tickets;
    }

    return {
      average: totalTickets ? totalUsd / totalTickets : 0,
      totalTickets,
      tokenType: 3, //USD
    };
  } catch (error) {
    logger.error("Error getting average ticket price:", error);
    return { average: 0, totalTickets: 0, tokenType: 3 };
  }
};

// Growth Rate (percentage change from previous period)
const getGrowthRate = async (startDate, endDate) => {
  try {
    // Calculate period duration
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(endDate.getTime() - periodDuration);

    // Get current period volume
    const [currentPeriodResult, previousPeriodResult] = await Promise.all([
      sequelize.query(
        `
        SELECT SUM(COALESCE(st.commissionAmount, 0) + COALESCE(st.creatorAmount, 0)) as totalVolume
        FROM spl_token_send_transactions st
        WHERE st.status = ?
          AND st.createdAt BETWEEN ? AND ?
        `,
        {
          replacements: [SPL_TOKEN_SEND_TX_STATUS.SUCCESS, startDate, endDate],
          type: sequelize.QueryTypes.SELECT,
        }
      ),
      sequelize.query(
        `
        SELECT SUM(COALESCE(st.commissionAmount, 0) + COALESCE(st.creatorAmount, 0)) as totalVolume
        FROM spl_token_send_transactions st
        WHERE st.status = ?
          AND st.createdAt BETWEEN ? AND ?
        `,
        {
          replacements: [
            SPL_TOKEN_SEND_TX_STATUS.SUCCESS,
            previousStartDate,
            previousEndDate,
          ],
          type: sequelize.QueryTypes.SELECT,
        }
      ),
    ]);

    const currentVolume = parseFloat(currentPeriodResult[0]?.totalVolume || 0);
    const previousVolume = parseFloat(
      previousPeriodResult[0]?.totalVolume || 0
    );

    let growthRate = 0;
    if (previousVolume > 0) {
      growthRate = ((currentVolume - previousVolume) / previousVolume) * 100;
    } else if (currentVolume > 0) {
      growthRate = 100; // Infinite growth from 0
    }

    return {
      percentage: parseFloat(growthRate.toFixed(2)),
      currentPeriod: currentVolume,
      previousPeriod: previousVolume,
      isPositive: growthRate >= 0,
    };
  } catch (error) {
    logger.error("Error getting growth rate:", error);
    return {
      percentage: 0,
      currentPeriod: 0,
      previousPeriod: 0,
      isPositive: false,
    };
  }
};

// Volume Over Time (for graph)
const getVolumeOverTime = async (startDate, endDate, period = "daily") => {
  try {
    const payments = await getTicketPayments(startDate, endDate);
    const groups = new Map();
    payments.forEach((payment) => {
      const date = new Date(payment.createdAt);
      const key = period === "monthly"
        ? date.toISOString().slice(0, 7)
        : date.toISOString().slice(0, 10);
      const current = groups.get(key) || {
        period: key,
        date: key,
        totalVolume: 0,
        commissionVolume: 0,
        creatorVolume: 0,
        transactionsCount: 0,
        activeUsers: new Set(),
        ticketsSold: 0,
        winnersCount: 0,
      };
      current.totalVolume += payment.totalUsd;
      current.commissionVolume += payment.commissionUsd;
      current.creatorVolume += payment.creatorUsd;
      current.transactionsCount += 1;
      current.activeUsers.add(payment.senderPubkey);
      current.ticketsSold += Number(payment.ticketsSold || 0);
      current.winnersCount += Number(payment.winnersCount || 0);
      groups.set(key, current);
    });
    return [...groups.values()].map(({ activeUsers, ...item }) => ({
      ...item,
      activeUsers: activeUsers.size,
    }));
  } catch (error) {
    logger.error("Error getting volume over time:", error);
    return [];
  }
};

// Volume by Token Type (for pie chart)
const getVolumeByTokenType = async (startDate, endDate) => {
  try {
    const payments = await getTicketPayments(startDate, endDate);
    const groups = new Map();
    payments.forEach((payment) => {
      const key = `${payment.type}:${payment.tokenAddress}`;
      const current = groups.get(key) || {
        tokenType: payment.type,
        tokenAddress: payment.tokenAddress,
        transactionsCount: 0,
        totalVolume: 0,
        commissionVolume: 0,
        creatorVolume: 0,
        users: new Set(),
        ticketsSold: 0,
        winnersCount: 0,
      };
      current.transactionsCount += 1;
      current.totalVolume += payment.totalUsd;
      current.commissionVolume += payment.commissionUsd;
      current.creatorVolume += payment.creatorUsd;
      current.users.add(payment.senderPubkey);
      current.ticketsSold += Number(payment.ticketsSold || 0);
      current.winnersCount += Number(payment.winnersCount || 0);
      groups.set(key, current);
    });
    const result = [...groups.values()];

    // Calculate total for percentages
    const totalVolume = result.reduce(
      (sum, item) => sum + parseFloat(item.totalVolume || 0),
      0
    );

    return result.map((item) => ({
      tokenType: mapEnumValue(TOKEN_TYPE, item.tokenType),
      tokenTypeRaw: item.tokenType,
      tokenAddress: item.tokenAddress,
      totalVolume: item.totalVolume,
      percentage:
        totalVolume > 0
          ? parseFloat(((item.totalVolume / totalVolume) * 100).toFixed(8))
          : 0,
      commissionVolume: item.commissionVolume,
      creatorVolume: item.creatorVolume,
      transactionsCount: item.transactionsCount,
      uniqueUsers: item.users.size,
      ticketsSold: item.ticketsSold,
      winnersCount: item.winnersCount,
    }));
  } catch (error) {
    logger.error("Error getting volume by token type:", error);
    return [];
  }
};

class AnalyticsController {
  static async getAnalytics(req, res) {
    try {
      const {
        startDate,
        endDate,
        period = "daily", // daily, weekly, monthly
      } = req.query;

      // Parse dates or use defaults
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
      const end = endDate ? new Date(endDate) : new Date();

      const [
        totalUsers,
        activeUsers,
        avgTicketPrice,
        growthRate,
        volumeOverTime,
        volumeByTokenType,
      ] = await Promise.all([
        getTotalUsers(),
        getActiveUsers(start, end),
        getAverageTicketPrice(start, end),
        getGrowthRate(start, end),
        getVolumeOverTime(start, end, period),
        getVolumeByTokenType(start, end),
      ]);

      return respond(res, httpStatus.OK, "Analytics fetched successfully", {
        totalUsers,
        activeUsers,
        averageTicketPrice: avgTicketPrice,
        growthRate,
        volumeOverTime,
        volumeByTokenType,
      });
    } catch (error) {
      logger.error("Error getting analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics data",
      });
    }
  }
}

module.exports = AnalyticsController;
