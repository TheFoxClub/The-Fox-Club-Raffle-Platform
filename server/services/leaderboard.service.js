const {
  SPL_TOKEN_SEND_TX_STATUS,
  mapEnumValue,
  TOKEN_TYPE,
  SPL_TOKEN_ADDRESS,
} = require("../config/data");
const { sequelize } = require("../models");
const logger = require("../util/logger");
const PriceService = require("./price.service");
const { getTokenUsdPrice } = require("./price.service");
const { getXpRates } = require("./xp.service");

const getTopHosts = async (limit = 10, xpConfig) => {
  try {
    // Get top hosts by SOL revenue only (tokenType = 0) from raffles table
    const results = await sequelize.query(
      `
      SELECT
        u.pubkey as walletAddress,
        COALESCE(SUM(
          CASE WHEN r.tokenType = 0 THEN r.claimableAmount + r.totalCommission ELSE 0 END
        ), 0) AS totalRevenue,
        COUNT(CASE WHEN r.tokenType = 0 THEN r.id END) as rafflesCount,
        0 as tokenType
      FROM users u
      LEFT JOIN raffles r ON u.id = r.userId AND r.status != 0
      GROUP BY u.id, u.pubkey
      HAVING totalRevenue > 0
      ORDER BY totalRevenue DESC
      LIMIT ?
      `,
      {
        replacements: [parseInt(limit, 10)],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    //converting sol to usd, and converting usd to XP as per XP Configs
    const solToUsdPrice = await PriceService.getTokenUsdPrice(
      SPL_TOKEN_ADDRESS.SOLANA
    );

    //converting each revenue to XP
    const xpResults = results.map((host, index) => ({
      rank: index + 1,
      walletAddress: host.walletAddress,
      totalRevenue:
        (parseFloat(host.totalRevenue || 0) * solToUsdPrice) /
        xpConfig.raffle_revenue_rate,
      rafflesCount: parseInt(host.rafflesCount || 0, 10),
      tokenType: mapEnumValue(TOKEN_TYPE, host.tokenType),
      isXPValue: true,
      tokenAddress: null,
    }));

    return xpResults;
  } catch (error) {
    logger.error("Error getting top hosts:", error);
    return [];
  }
};

const getTopBuyers = async (limit = 10, xpConfig) => {
  try {
    // Get top buyers by SOL spending only (type = 0)
    const results = await sequelize.query(
      `
      SELECT
        senderPubkey AS walletAddress,
        COUNT(*) AS transactionsCount,
        SUM(COALESCE(commissionAmount, 0) + COALESCE(creatorAmount, 0)) AS totalSpent,
        SUM(COALESCE(commissionAmount, 0)) AS totalCommission,
        SUM(COALESCE(creatorAmount, 0)) AS totalCreatorAmount,
        0 AS tokenType
      FROM spl_token_send_transactions
      WHERE status = ? AND type = 0
      GROUP BY senderPubkey
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

    const winsData = await sequelize.query(
      `
      SELECT 
        st.senderPubkey AS walletAddress,
        COUNT(rt.id) AS totalWins
      FROM spl_token_send_transactions st
      INNER JOIN raffle_tickets rt ON rt.splTokenSendTxId = st.id
      WHERE st.senderPubkey IN (?)
        AND rt.isWinner = 1
        AND st.status = ?
        AND st.type = 0
      GROUP BY st.senderPubkey
      `,
      {
        replacements: [walletAddresses, SPL_TOKEN_SEND_TX_STATUS.SUCCESS],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Convert wins data to a lookup object
    const winsLookup = winsData.reduce((acc, item) => {
      acc[item.walletAddress] = parseInt(item.totalWins || 0, 10);
      return acc;
    }, {});

    //converting sol to usd, and converting usd to XP as per XP Configs
    const solToUsdPrice = await PriceService.getTokenUsdPrice(
      SPL_TOKEN_ADDRESS.SOLANA
    );

    const xpBuyers = buyers.map((buyer, index) => ({
      rank: index + 1,
      walletAddress: buyer.walletAddress,
      totalSpent:
        (parseFloat(buyer.totalSpent || 0) * solToUsdPrice) /
        xpConfig.ticket_purchase_rate,
      ticketsBought: parseInt(ticketCounts[buyer.walletAddress] || 0, 10),
      transactionsCount: parseInt(buyer.transactionsCount || 0, 10),
      totalWins: winsLookup[buyer.walletAddress] || 0,
      tokenType: mapEnumValue(TOKEN_TYPE, buyer.tokenType),
      tokenAddress: null,
    }));

    return xpBuyers;
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
