const {
  SPL_TOKEN_SEND_TX_STATUS,
  mapEnumValue,
  TOKEN_TYPE,
} = require("../config/data");
const { sequelize } = require("../models");
const logger = require("../util/logger");

const getTopHosts = async (limit = 10) => {
  try {
    const results = await sequelize.query(
      `
      SELECT
        u.pubkey as walletAddress,
        COALESCE(SUM(r.claimableAmount + r.totalCommission), 0) AS totalRevenue,
        COUNT(r.id) as rafflesCount,
        r.tokenType as raffleTokenType
      FROM users u
      LEFT JOIN raffles r ON u.id = r.userId
      GROUP BY u.id, u.pubkey, r.tokenType
      HAVING COUNT(r.id) > 0
      ORDER BY totalRevenue DESC
      LIMIT ?
      `,
      {
        replacements: [parseInt(limit, 10)],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return results.map((host, index) => ({
      rank: index + 1,
      walletAddress: host.walletAddress,
      totalRevenue: parseFloat(host.totalRevenue || 0),
      rafflesCount: parseInt(host.rafflesCount || 0, 10),
      tokenType: mapEnumValue(TOKEN_TYPE, host.raffleTokenType),
    }));
  } catch (error) {
    logger.error("Error getting top hosts:", error);
    return [];
  }
};

const getTopBuyers = async (limit = 10) => {
  try {
    const results = await sequelize.query(
      `
      SELECT
        senderPubkey AS walletAddress,
        COUNT(*) AS transactionsCount,
        SUM(COALESCE(commissionAmount, 0) + COALESCE(creatorAmount, 0)) AS totalSpent,
        SUM(COALESCE(commissionAmount, 0)) AS totalCommission,
        SUM(COALESCE(creatorAmount, 0)) AS totalCreatorAmount,
        type AS transactionType
      FROM spl_token_send_transactions
      WHERE status = ?
      GROUP BY senderPubkey, type
      HAVING totalSpent > 0
      ORDER BY totalSpent DESC
      LIMIT ?
      `,
      {
        replacements: [SPL_TOKEN_SEND_TX_STATUS.SUCCESS, parseInt(limit, 10)],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const buyers = Array.isArray(results) ? results : [];
    if (!buyers.length) return [];

    const walletAddresses = buyers.map((b) => b.walletAddress);

    const userDetails = await sequelize.query(
      `
      SELECT pubkey
      FROM users
      WHERE pubkey IN (?)
      `,
      {
        replacements: [walletAddresses],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const ticketCounts = await getTicketCountsByBuyers(walletAddresses);

    return buyers.map((buyer, index) => ({
      rank: index + 1,
      walletAddress: buyer.walletAddress,
      totalSpent: parseFloat(buyer.totalSpent || 0),
      ticketsBought: parseInt(ticketCounts[buyer.walletAddress] || 0, 10),
      transactionsCount: parseInt(buyer.transactionsCount || 0, 10),
      tokenType: mapEnumValue(TOKEN_TYPE, buyer.transactionType),
    }));
  } catch (error) {
    logger.error("Error getting top buyers:", error);
    return [];
  }
};

const getTicketCountsByBuyers = async (walletAddresses) => {
  try {
    if (!walletAddresses || walletAddresses.length === 0) {
      return {};
    }

    const results = await sequelize.query(
      `
      SELECT u.pubkey, COUNT(rt.id) as ticketCount
      FROM users u
      INNER JOIN raffle_tickets rt ON u.id = rt.userId
      WHERE u.pubkey IN (?)
        AND rt.splTokenSendTxId IS NOT NULL
      GROUP BY u.pubkey
    `,
      {
        replacements: [walletAddresses],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const ticketCounts = {};
    if (Array.isArray(results)) {
      results.forEach((row) => {
        ticketCounts[row.pubkey] = parseInt(row.ticketCount || 0, 10);
      });
    }

    return ticketCounts;
  } catch (error) {
    logger.error("Error getting ticket counts:", error);
    return {};
  }
};

module.exports = { getTopHosts, getTopBuyers };
