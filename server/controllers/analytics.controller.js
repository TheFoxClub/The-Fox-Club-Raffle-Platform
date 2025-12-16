const { sequelize } = require("../models");
const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const {
  SPL_TOKEN_SEND_TX_STATUS,
  TOKEN_TYPE,
  mapEnumValue,
} = require("../config/data");

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
    const result = await sequelize.query(
      `
      SELECT 
        AVG(COALESCE(rt.commissionRate, 0) + COALESCE(rt.creatorAmount, 0)) as avgTicketPrice,
        COUNT(rt.id) as totalTickets
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
    return {
      average: parseFloat(result[0]?.avgTicketPrice || 0),
      totalTickets: parseInt(result[0]?.totalTickets || 0, 10),
    };
  } catch (error) {
    logger.error("Error getting average ticket price:", error);
    return { average: 0, totalTickets: 0 };
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
    let dateFormat, groupBy;

    // Set date format based on period
    switch (period.toLowerCase()) {
      case "weekly":
        dateFormat = "%Y-%u"; // Year-Week number
        groupBy = 'CONCAT(YEAR(st.createdAt), "-W", WEEK(st.createdAt))';
        break;
      case "monthly":
        dateFormat = "%Y-%m"; // Year-Month
        groupBy = 'DATE_FORMAT(st.createdAt, "%Y-%m")';
        break;
      case "daily":
      default:
        dateFormat = "%Y-%m-%d"; // Year-Month-Day
        groupBy = "DATE(st.createdAt)";
        break;
    }

    const result = await sequelize.query(
      `
      SELECT 
        ${groupBy} as period,
        DATE_FORMAT(MIN(st.createdAt), '${dateFormat}') as date,
        COUNT(DISTINCT st.senderPubkey) as activeUsers,
        COUNT(st.id) as transactionsCount,
        SUM(COALESCE(st.commissionAmount, 0) + COALESCE(st.creatorAmount, 0)) as totalVolume,
        SUM(COALESCE(st.commissionAmount, 0)) as commissionVolume,
        SUM(COALESCE(st.creatorAmount, 0)) as creatorVolume,
        COUNT(rt.id) as ticketsSold,
        SUM(CASE WHEN rt.isWinner = 1 THEN 1 ELSE 0 END) as winnersCount
      FROM spl_token_send_transactions st
      LEFT JOIN raffle_tickets rt ON rt.splTokenSendTxId = st.id
      WHERE st.status = ?
        AND st.createdAt BETWEEN ? AND ?
      GROUP BY ${groupBy}
      ORDER BY MIN(st.createdAt) ASC
      `,
      {
        replacements: [SPL_TOKEN_SEND_TX_STATUS.SUCCESS, startDate, endDate],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return result.map((item) => ({
      period: item.period,
      date: item.date,
      totalVolume: parseFloat(item.totalVolume || 0),
      commissionVolume: parseFloat(item.commissionVolume || 0),
      creatorVolume: parseFloat(item.creatorVolume || 0),
      transactionsCount: parseInt(item.transactionsCount || 0, 10),
      activeUsers: parseInt(item.activeUsers || 0, 10),
      ticketsSold: parseInt(item.ticketsSold || 0, 10),
      winnersCount: parseInt(item.winnersCount || 0, 10),
    }));
  } catch (error) {
    logger.error("Error getting volume over time:", error);
    return [];
  }
};

// Volume by Token Type (for pie chart)
const getVolumeByTokenType = async (startDate, endDate) => {
  try {
    const result = await sequelize.query(
      `
      SELECT 
        st.type as tokenType,
        COUNT(st.id) as transactionsCount,
        SUM(COALESCE(st.commissionAmount, 0) + COALESCE(st.creatorAmount, 0)) as totalVolume,
        SUM(COALESCE(st.commissionAmount, 0)) as commissionVolume,
        SUM(COALESCE(st.creatorAmount, 0)) as creatorVolume,
        COUNT(DISTINCT st.senderPubkey) as uniqueUsers,
        COUNT(rt.id) as ticketsSold,
        SUM(CASE WHEN rt.isWinner = 1 THEN 1 ELSE 0 END) as winnersCount
      FROM spl_token_send_transactions st
      LEFT JOIN raffle_tickets rt ON rt.splTokenSendTxId = st.id
      WHERE st.status = ?
        AND st.createdAt BETWEEN ? AND ?
      GROUP BY st.type
      ORDER BY totalVolume DESC
      `,
      {
        replacements: [SPL_TOKEN_SEND_TX_STATUS.SUCCESS, startDate, endDate],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Calculate total for percentages
    const totalVolume = result.reduce(
      (sum, item) => sum + parseFloat(item.totalVolume || 0),
      0
    );

    return result.map((item) => ({
      tokenType: mapEnumValue(TOKEN_TYPE, item.tokenType),
      tokenTypeRaw: item.tokenType,
      totalVolume: parseFloat(item.totalVolume || 0),
      percentage:
        totalVolume > 0
          ? parseFloat(((item.totalVolume / totalVolume) * 100).toFixed(2))
          : 0,
      commissionVolume: parseFloat(item.commissionVolume || 0),
      creatorVolume: parseFloat(item.creatorVolume || 0),
      transactionsCount: parseInt(item.transactionsCount || 0, 10),
      uniqueUsers: parseInt(item.uniqueUsers || 0, 10),
      ticketsSold: parseInt(item.ticketsSold || 0, 10),
      winnersCount: parseInt(item.winnersCount || 0, 10),
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
