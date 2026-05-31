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
    // Get host raffle revenue records from non-draft raffles.
    // Sort and limit are applied after USD normalization.

    const results2 = await sequelize.query(
      `
  SELECT
    u.pubkey AS walletAddress,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'raffleId', r.id,
        'revenue', (COALESCE(r.claimableAmount,0) + COALESCE(r.totalCommission,0)),
        'tokenAddress', r.tokenAddress,
        'tokenType', r.tokenType
      )
    ) AS raffles
  FROM users u
  INNER JOIN raffles r
    ON u.id = r.userId
  WHERE r.status != 0
  GROUP BY u.id, u.pubkey
  `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    //converting sol to usd, and converting usd to XP as per XP Configs
    const solToUsdPrice = await PriceService.getTokenUsdPrice(
      SPL_TOKEN_ADDRESS.SOLANA
    );

    // normalize
    const normalized = [];

    for (const row of results2) {
      const raffles =
        typeof row.raffles === "string" ? JSON.parse(row.raffles) : row.raffles;

      let totalRevenueUsd = 0;

      const normalizedRaffles = [];

      for (const raffle of raffles) {
        let tokenAddress = raffle.tokenAddress;

        // Fallback token address when older raffle rows do not persist tokenAddress.
        if (!tokenAddress) {
          if (raffle.tokenType === TOKEN_TYPE.SOLANA) {
            tokenAddress = SPL_TOKEN_ADDRESS.SOLANA;
          } else if (raffle.tokenType === TOKEN_TYPE.USDC) {
            tokenAddress = SPL_TOKEN_ADDRESS.USDC;
          }
        }

        const price = await PriceService.getTokenUsdPrice(tokenAddress);

        const revenueUsd = parseFloat(raffle.revenue || 0) * price;

        totalRevenueUsd += revenueUsd;

        normalizedRaffles.push({
          raffleId: raffle.raffleId,
          tokenAddress,
          revenue: parseFloat(raffle.revenue || 0),
          revenueUsd,
        });
      }

      normalized.push({
        walletAddress: row.walletAddress,
        totalRevenueUsd,
        raffles: normalizedRaffles,
        raffleCount: raffles.length || 0,
      });
    }

    normalized.sort((a, b) => b.totalRevenueUsd - a.totalRevenueUsd);

    const requestedLimit = parseInt(limit, 10) || 10;
    const limitedHosts = normalized.slice(0, requestedLimit);

    //converting each revenue to XP
    const xpResults = limitedHosts.map((host, index) => ({
      rank: index + 1,
      walletAddress: host.walletAddress,
      totalRevenue: parseFloat(host.totalRevenueUsd) || 0, //usd
      totalRevenueSol: solToUsdPrice > 0 ? host.totalRevenueUsd / solToUsdPrice : 0,
      totalRevenueXp:
        parseFloat(host.totalRevenueUsd) / xpConfig.raffle_revenue_rate,
      rafflesCount: parseInt(host.raffleCount || 0, 10),
      raffles: host.raffles,
      // tokenType: mapEnumValue(TOKEN_TYPE, host.tokenType),
      isXPValue: false,
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
        st.senderPubkey AS walletAddress,
        COUNT(DISTINCT st.id) AS transactionsCount,
        SUM(COALESCE(xp.xpEarned, 0)) AS totalXpEarned,
        SUM(COALESCE(xp.usdValue, 0)) AS totalSpent
      FROM spl_token_send_transactions st
      LEFT JOIN xp_tables xp
        ON xp.splTokenSendTransactionId = st.id
      WHERE st.status = ?
        AND st.rewardTransferType = 'ticket_purchase'
      GROUP BY st.senderPubkey
      HAVING totalSpent > 0
      ORDER BY totalXpEarned DESC
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
    // const solToUsdPrice = await PriceService.getTokenUsdPrice(
    //   SPL_TOKEN_ADDRESS.SOLANA
    // );
    const solPriceInUsd = await PriceService.getSolPrice();

    const xpBuyers = buyers.map((buyer, index) => ({
      rank: index + 1,
      walletAddress: buyer.walletAddress,
      totalXpEarned: buyer.totalXpEarned,
      totalSpent: parseFloat(buyer.totalSpent) || 0, //in USD
      totalSolSpent: parseFloat(buyer.totalSpent || 0) / solPriceInUsd, //in SOL
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
