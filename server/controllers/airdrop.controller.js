const { status: httpStatus } = require("http-status");
const { Op } = require("sequelize");
const { User, UserInfo, XpTable, AirdropReward, UserAirdropReward, SplTokenSendTransaction, sequelize } = require("../models");
const XpService = require("../services/xp.service");
const { getConnection } = require("../config/solana");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");

const { sendMultipleSplTokenTx, TRANSFER_DIRECTION, createAirdropClaimTransaction } = require("../helpers/solana/spl-token-send-tx");
const { getFeeData } = require("../helpers/cache/system-fee");
const { AirdropWallet } = require("../helpers/solana/airdrop-wallet");
const { RAFFLE_REWARD_TYPES, SPL_TOKEN_ADDRESS, SPL_TOKEN_SEND_TX_STATUS, SPL_TOKEN_SEND_TRANSACTION_TYPE } = require("../config/data");

const AIRDROP_STATUS = AirdropReward.STATUS;
const REWARD_TYPE = AirdropReward.REWARD_TYPE;
const USER_REWARD_STATUS = UserAirdropReward.STATUS;

const waitForConfirmedSignature = async (
  signature,
  timeoutMs = 30000,
  intervalMs = 1500,
  minObservationMs = 20000
) => {
  const connection = getConnection();
  const startedAt = Date.now();
  let seenConfirmed = false;

  while (Date.now() - startedAt <= timeoutMs) {
    const elapsedMs = Date.now() - startedAt;
    const statuses = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });

    const status = statuses?.value?.[0];

    if (status?.err) {
      return {
        confirmed: false,
        reason: `On-chain transaction failed: ${JSON.stringify(status.err)}`,
      };
    }

    if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) {
      seenConfirmed = true;

      // Signature presence alone is not success. We require a minimum observation
      // window to reduce false positives from early/temporary statuses.
      if (elapsedMs >= minObservationMs) {
        return { confirmed: true };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return {
    confirmed: false,
    reason: seenConfirmed
      ? "Transaction confirmation did not remain verifiable long enough"
      : "Transaction is not yet confirmed on-chain",
  };
};

class AirdropController {
  /**
   * Get periodic XP leaderboard for airdrop recipient selection
   */
  static async getXpLeaderboard(req, res) {
    try {
      const { startDate, endDate, limit } = req.query;

      const now = new Date();
      const hasExplicitLimit = limit !== undefined && limit !== null && String(limit).trim() !== "";
      const parsedLimit = hasExplicitLimit ? parseInt(limit, 10) : null;

      if (hasExplicitLimit && (!Number.isInteger(parsedLimit) || parsedLimit <= 0)) {
        return respond(res, httpStatus.BAD_REQUEST, "limit must be a positive integer when provided");
      }

      const hasCustomRange = Boolean(startDate && endDate);
      let rangeStart;
      let rangeEnd;

      if (!hasCustomRange) {
        return respond(res, httpStatus.BAD_REQUEST, "startDate and endDate are required for custom range");
      }

      rangeStart = new Date(startDate);
      rangeEnd = new Date(endDate);

      if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
        return respond(res, httpStatus.BAD_REQUEST, "Invalid startDate or endDate format");
      }

      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);

      if (rangeStart > rangeEnd) {
        return respond(res, httpStatus.BAD_REQUEST, "startDate cannot be after endDate");
      }
      
      logger.info(
        `Fetching XP leaderboard from ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`
      );

      const topEarners = await XpTable.findAll({
        attributes: [
          "userId",
          [sequelize.fn("SUM", sequelize.col("xpEarned")), "periodXp"],
          [sequelize.fn("SUM", sequelize.col("usdValue")), "periodUsdValue"],
          [sequelize.fn("COUNT", sequelize.col("XpTable.id")), "transactionCount"],
        ],
        where: {
          createdAt: {
            [Op.gte]: rangeStart,
            [Op.lte]: rangeEnd,
          },
        },
        group: ["userId"],
        order: [[sequelize.fn("SUM", sequelize.col("xpEarned")), "DESC"]],
        ...(hasExplicitLimit ? { limit: parsedLimit } : {}),
        raw: true,
      });

      const enrichedEarners = await Promise.all(
        topEarners.map(async (earner, index) => {
          const user = await User.findByPk(earner.userId, {
            attributes: ["id", "pubkey", "totalXp"],
            include: [
              {
                model: UserInfo,
                attributes: ["username"],
                required: false,
              },
            ],
          });

          return {
            rank: index + 1,
            userId: earner.userId,
            walletAddress: user?.pubkey || "Unknown",
            username: user?.user_info?.username || null,
            periodXp: parseFloat(earner.periodXp || 0),
            periodUsdValue: parseFloat(earner.periodUsdValue || 0),
            transactionCount: parseInt(earner.transactionCount || 0),
            allTimeXp: parseFloat(user?.totalXp || 0),
          };
        })
      );

      return respond(res, httpStatus.OK, "Periodic XP leaderboard retrieved successfully", {
        period: {
          customRange: true,
          startDate: rangeStart.toISOString(),
          endDate: rangeEnd.toISOString(),
        },
        totalParticipants: enrichedEarners.length,
        leaderboard: enrichedEarners,
      });
    } catch (err) {
      logger.error("Error fetching periodic XP leaderboard:", err);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, parseSequelizeErrors(err));
    }
  }

  /**
   * Get all airdrop reward campaigns with optional filtering
   */
  static async getAllAirdrops(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const whereClause = {};
      if (status !== undefined) {
        whereClause.status = parseInt(status);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: airdrops } = await AirdropReward.findAndCountAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset,
        include: [
          {
            model: UserAirdropReward,
            as: "userRewards",
            attributes: ["id", "status"],
          },
        ],
      });

      const enrichedAirdrops = airdrops.map((airdrop) => {
        const data = airdrop.toJSON();
        const rewards = data.userRewards || [];
        const claimedCount = rewards.filter((r) => r.status === USER_REWARD_STATUS.CLAIMED).length;

        return {
          id: data.id,
          totalAmount: data.totalAmount,
          type: data.type,
          tokenSymbol: data.tokenSymbol,
          status: data.status,
          createdAt: data.createdAt,
          claimedCount,
          totalReceivers: rewards.length,
        };
      });

      return respond(res, httpStatus.OK, "Airdrops retrieved successfully", {
        airdrops: enrichedAirdrops,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      });
    } catch (err) {
      logger.error("Error fetching airdrops:", err);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, parseSequelizeErrors(err));
    }
  }

  /**
   * Update airdrop campaign status
   */
  static async updateAirdropStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const airdrop = await AirdropReward.findByPk(id);

      if (!airdrop) {
        return respond(res, httpStatus.NOT_FOUND, "Airdrop not found");
      }

      if (status === undefined) {
        return respond(res, httpStatus.BAD_REQUEST, "status is required");
      }

      const parsedStatus = parseInt(status, 10);

      if (Number.isNaN(parsedStatus)) {
        return respond(res, httpStatus.BAD_REQUEST, "status must be a valid integer");
      }

      const validTransitions = {
        [AIRDROP_STATUS.FUNDED]: [AIRDROP_STATUS.ACTIVE, AIRDROP_STATUS.CANCELLED],
        [AIRDROP_STATUS.ACTIVE]: [AIRDROP_STATUS.COMPLETED, AIRDROP_STATUS.CANCELLED],
        [AIRDROP_STATUS.COMPLETED]: [],
        [AIRDROP_STATUS.CANCELLED]: [],
      };

      if (!validTransitions[airdrop.status]?.includes(parsedStatus)) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Invalid status transition from ${Object.keys(AIRDROP_STATUS).find((k) => AIRDROP_STATUS[k] === airdrop.status)} to ${Object.keys(AIRDROP_STATUS).find((k) => AIRDROP_STATUS[k] === parsedStatus)}`
        );
      }

      const updateData = { status: parsedStatus };

      await airdrop.update(updateData);

      logger.info(`Airdrop ${id} updated: ${JSON.stringify(updateData)}`);

      return respond(res, httpStatus.OK, "Airdrop updated successfully", {
        airdrop: airdrop.toJSON(),
      });
    } catch (err) {
      logger.error("Error updating airdrop status:", err);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, parseSequelizeErrors(err));
    }
  }

  /**
   * Prepare airdrop funding transaction.
   * Creates a transaction for admin to sign to transfer tokens to the platform/airdrop wallet
   */
  static async prepareAirdropFunding(req, res) {
    try {
      const { totalAmount, rewardType, tokenAddress, fromAddress, tokenDecimals = 9 } = req.body;

      logger.info(`Preparing airdrop funding: amount=${totalAmount}, type=${rewardType}, from=${fromAddress}`);

      if (!totalAmount || totalAmount <= 0) {
        return respond(res, httpStatus.BAD_REQUEST, "Total amount is required and must be greater than 0");
      }

      if (!fromAddress) {
        return respond(res, httpStatus.BAD_REQUEST, "fromAddress is required");
      }

      let type;
      let tokenMint;

      const numericType = typeof rewardType === "number" ? rewardType : parseInt(rewardType);

      switch (numericType) {
        case REWARD_TYPE.SOL:
          type = RAFFLE_REWARD_TYPES.SOLANA;
          tokenMint = SPL_TOKEN_ADDRESS.SOLANA;
          break;
        case REWARD_TYPE.SPL_TOKEN:
          type = RAFFLE_REWARD_TYPES.SPL_TOKEN;
          tokenMint = tokenAddress;
          break;
        case REWARD_TYPE.SPL_TOKEN_2022:
          type = RAFFLE_REWARD_TYPES.SPL_TOKEN_2022;
          tokenMint = tokenAddress;
          break;
        default:
          type = RAFFLE_REWARD_TYPES.SOLANA;
          tokenMint = SPL_TOKEN_ADDRESS.SOLANA;
      }

      if (!tokenMint && numericType !== REWARD_TYPE.SOL) {
        return respond(res, httpStatus.BAD_REQUEST, "Token address is required for SPL token transfers");
      }

      const splTokenSendSummary = [
        {
          tokenAddress: tokenMint,
          toAccount: AirdropWallet.getWalletAddress(),
          amount: parseFloat(totalAmount),
          type,
          decimals: tokenDecimals,
          metadata: { purpose: "airdrop_funding", rewardType: numericType },
        },
      ];

      const feeData = await getFeeData();

      const transferResponse = await sendMultipleSplTokenTx({
        splTokenSendSummary,
        solCommission: 0,
        feePayer: fromAddress,
        feeData,
        fromAccount: fromAddress,
        isUserToPlatform: true,
        transferDirection: TRANSFER_DIRECTION.ADMIN_TO_AIRDROP,
      });

      if (!transferResponse.success) {
        logger.error(`Failed to create funding transaction: ${transferResponse.message}`);
        return respond(res, httpStatus.BAD_REQUEST, `Failed to create funding transaction: ${transferResponse.message}`);
      }

      return respond(res, httpStatus.OK, "Airdrop funding transaction prepared", {
        transaction: transferResponse.data.serializedTx,
        blockhash: transferResponse.data.blockhash,
        fundingData: {
          totalAmount: parseFloat(totalAmount),
          rewardType: numericType,
          tokenAddress: tokenMint,
          airdropWallet: AirdropWallet.getWalletAddress(),
        },
      });
    } catch (err) {
      logger.error("Error in prepareAirdropFunding:", err);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, parseSequelizeErrors(err));
    }
  }

  /**
   * Confirm airdrop funding and create the campaign + per-user reward records.
   *
   * Frontend sends:
   *   - recipients: [{ pubKey: string, xp: number }]
   *   - totalXp: number  (sum of all selected recipients' XP — used as denominator)
   *
   * Backend calculates each user's token amount as:
   *   amount = (recipient.xp / totalXp) * totalAmount
   */
  static async confirmAirdropFunding(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        rewardType,
        tokenAddress,
        tokenSymbol,
        tokenDecimals,
        totalAmount,
        recipients,    // Array of { pubKey: string, xp: number }
        totalXp,       // Sum of all selected users' XP (denominator for proportion)
        fundingSignature,
        fromAddress,
      } = req.body;

      logger.info(`Confirming airdrop funding: sig=${fundingSignature}, amount=${totalAmount}, recipients=${recipients?.length}`);

      if (!fundingSignature) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "Funding signature is required");
      }

      const existingFundingTx = await SplTokenSendTransaction.findOne({
        where: { txId: fundingSignature },
        transaction,
      });

      if (existingFundingTx) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "Funding transaction already recorded");
      }

      if (!recipients || recipients.length === 0) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "At least one recipient is required");
      }

      if (!totalXp || parseFloat(totalXp) <= 0) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "totalXp must be greater than 0");
      }

      const invalidRecipient = recipients.find(
        (recipient) => !recipient?.pubKey || Number.isNaN(parseFloat(recipient?.xp)) || parseFloat(recipient?.xp) <= 0
      );

      if (invalidRecipient) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "Each recipient must include valid pubKey and xp values");
      }

      if (!totalAmount || parseFloat(totalAmount) <= 0) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "totalAmount must be greater than 0");
      }

      const fundingConfirmation = await waitForConfirmedSignature(fundingSignature);
      if (!fundingConfirmation.confirmed) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          fundingConfirmation.reason || "Funding transaction is not confirmed"
        );
      }

      const numericType = typeof rewardType === "number" ? rewardType : parseInt(rewardType || 0);
      const adminUserId = req.payload?.id || 1;
      const airdropWalletAddress = AirdropWallet.getWalletAddress();
      const parsedTotalAmount = parseFloat(totalAmount);
      const parsedTotalXp = parseFloat(totalXp);
      const recipientsTotalXp = recipients.reduce((sum, recipient) => sum + parseFloat(recipient.xp), 0);

      if (Math.abs(recipientsTotalXp - parsedTotalXp) > 0.000001) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "totalXp does not match the sum of recipient xp values");
      }

      let splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA;
      if (numericType === REWARD_TYPE.SPL_TOKEN) splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN;
      else if (numericType === REWARD_TYPE.SPL_TOKEN_2022) splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN_2022;

      // Record the funding transaction
      const splTxRecord = await SplTokenSendTransaction.create(
        {
          senderPubkey: fromAddress,
          receiverPubkey: airdropWalletAddress,
          type: splType,
          txId: fundingSignature,
          tokenAddress: tokenAddress || null,
          decimals: tokenDecimals || 9,
          uiAmount: String(parsedTotalAmount),
          status: SPL_TOKEN_SEND_TX_STATUS?.CONFIRMED || 2,
          additionalJson: { purpose: "airdrop_funding" },
        },
        { transaction }
      );

      // Create the airdrop reward campaign (starts as FUNDED, admin can make it claimable)
      const airdrop = await AirdropReward.create(
        {
          type: numericType,
          tokenAddress: tokenAddress || null,
          tokenDecimals: tokenDecimals || 9,
          tokenSymbol: tokenSymbol || (numericType === REWARD_TYPE.SOL ? "SOL" : null),
          totalAmount: parsedTotalAmount,
          status: AIRDROP_STATUS.FUNDED,
          airdropWallet: airdropWalletAddress,
          fundingTxId: splTxRecord.id,
          creatorUserId: adminUserId,
        },
        { transaction }
      );

      // Calculate each user's proportional amount: (userXp / totalXp) * totalAmount
      const userRewardsData = recipients.map((recipient) => {
        const userXp = parseFloat(recipient.xp || 0);
        const calculatedAmount = parseFloat(((userXp / parsedTotalXp) * parsedTotalAmount).toFixed(9));

        return {
          status: USER_REWARD_STATUS.PENDING,
          airdropRewardId: airdrop.id,
          pubKey: recipient.pubKey,
          amount: calculatedAmount,
          xp: userXp,
          splTokenTxId: null,
          claimedAt: null,
        };
      });

      const userRewards = await UserAirdropReward.bulkCreate(userRewardsData, { transaction });

      logger.info(`Airdrop ${airdrop.id} created with ${userRewards.length} user rewards`);

      await transaction.commit();

      return respond(res, httpStatus.CREATED, "Airdrop created and funded successfully", {
        airdrop: {
          ...airdrop.toJSON(),
          totalReceivers: userRewards.length,
        },
        fundingTxRecordId: splTxRecord.id,
      });
    } catch (err) {
      await transaction.rollback();
      logger.error("Error in confirmAirdropFunding:", err);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, parseSequelizeErrors(err));
    }
  }

  /**
   * Get unclaimed airdrop rewards for the authenticated user, matched by wallet pubKey
   */
  static async getUserUnclaimedRewards(req, res) {
    try {
      const userId = req.payload?.id;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      // Resolve user's wallet address from their user ID
      const user = await User.findByPk(userId, { attributes: ["id", "pubkey"] });

      if (!user?.pubkey) {
        return respond(res, httpStatus.NOT_FOUND, "User wallet not found");
      }

      const unclaimedRewards = await UserAirdropReward.findAll({
        where: {
          pubKey: user.pubkey,
          status: USER_REWARD_STATUS.PENDING,
        },
        include: [
          {
            model: AirdropReward,
            as: "airdropReward",
            where: {
              status: AIRDROP_STATUS.ACTIVE,
            },
            attributes: ["id", "tokenSymbol", "tokenAddress", "type"],
          },
        ],
      });

      const enrichedRewards = unclaimedRewards.map((reward) => ({
        ...reward.toJSON(),
        tokenSymbol: reward.airdropReward?.tokenSymbol,
        tokenAddress: reward.airdropReward?.tokenAddress,
        rewardType: reward.airdropReward?.type,
      }));

      const totalAmount = enrichedRewards.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

      return respond(res, httpStatus.OK, "Unclaimed rewards retrieved successfully", {
        rewards: enrichedRewards,
        totalUnclaimed: enrichedRewards.length,
        totalAmount,
      });
    } catch (err) {
      logger.error("Error fetching unclaimed rewards:", err);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, parseSequelizeErrors(err));
    }
  }

  /**
   * Prepare airdrop claim transaction (server partially signs with airdrop wallet; user completes)
   */
  static async prepareAirdropClaim(req, res) {
    try {
      const { rewardId } = req.params;
      const userId = req.payload?.id;

      if (!userId) {
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      const user = await User.findByPk(userId, { attributes: ["id", "pubkey"] });

      if (!user?.pubkey) {
        return respond(res, httpStatus.NOT_FOUND, "User wallet not found");
      }

      const userWallet = user.pubkey;

      const reward = await UserAirdropReward.findOne({
        where: {
          id: parseInt(rewardId),
          pubKey: userWallet,
          status: USER_REWARD_STATUS.PENDING,
        },
        include: [{ model: AirdropReward, as: "airdropReward" }],
      });

      if (!reward) {
        return respond(res, httpStatus.NOT_FOUND, "Reward not found for authenticated user");
      }

      const campaign = reward.airdropReward;

      if (!campaign || campaign.status !== AIRDROP_STATUS.ACTIVE) {
        return respond(res, httpStatus.BAD_REQUEST, "Airdrop is not active");
      }

      const claimResult = await createAirdropClaimTransaction({
        reward: {
          tokenAddress: campaign.tokenAddress,
          amount: parseFloat(reward.amount),
          type: campaign.type,
        },
        toAccount: userWallet,
        feePayer: userWallet,
      });

      if (!claimResult.success) {
        logger.error(`Failed to create claim transaction: ${claimResult.message}`);
        return respond(res, httpStatus.BAD_REQUEST, claimResult.message);
      }

      logger.info(`Prepared claim transaction for userReward ${rewardId}, wallet ${userWallet}`);

      return respond(res, httpStatus.OK, "Claim transaction prepared", {
        transaction: claimResult.data.serializedTx,
        blockhash: claimResult.data.blockhash,
        lastValidBlockHeight: claimResult.data.lastValidBlockHeight,
        rewardId: reward.id,
        amount: parseFloat(reward.amount),
        tokenSymbol: campaign.tokenSymbol,
      });
    } catch (err) {
      logger.error("Error preparing airdrop claim:", err);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, parseSequelizeErrors(err));
    }
  }

  /**
   * Confirm reward claim after user submits the signed on-chain transaction
   */
  static async claimReward(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { rewardId } = req.params;
      const { signature } = req.body;
      const userId = req.payload?.id;

      if (!signature) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "Transaction signature is required");
      }

      if (!userId) {
        await transaction.rollback();
        return respond(res, httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      const user = await User.findByPk(userId, {
        attributes: ["id", "pubkey"],
        transaction,
      });

      if (!user?.pubkey) {
        await transaction.rollback();
        return respond(res, httpStatus.NOT_FOUND, "User wallet not found");
      }

      const userWallet = user.pubkey;

      const existingClaimTx = await SplTokenSendTransaction.findOne({
        where: { txId: signature },
        transaction,
      });

      if (existingClaimTx) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "Claim transaction already recorded");
      }

      const reward = await UserAirdropReward.findOne({
        where: {
          id: parseInt(rewardId),
          pubKey: userWallet,
          status: USER_REWARD_STATUS.PENDING,
        },
        include: [{ model: AirdropReward, as: "airdropReward" }],
        transaction,
      });

      if (!reward) {
        await transaction.rollback();
        return respond(res, httpStatus.NOT_FOUND, "Reward not found for authenticated user or already claimed. Try Refreshing the page.");
      }

      const campaign = reward.airdropReward;

      if (!campaign || campaign.status !== AIRDROP_STATUS.ACTIVE) {
        await transaction.rollback();
        return respond(res, httpStatus.BAD_REQUEST, "Airdrop is not active");
      }

      const now = new Date();

      const claimConfirmation = await waitForConfirmedSignature(signature);
      if (!claimConfirmation.confirmed) {
        await transaction.rollback();
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          claimConfirmation.reason || "Claim transaction is not confirmed"
        );
      }

      // Determine token type for the SPL TX record
      let splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA;
      if (campaign.type === REWARD_TYPE.SPL_TOKEN) splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN;
      else if (campaign.type === REWARD_TYPE.SPL_TOKEN_2022) splType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN_2022;

      // Create the SPL TX record for the claim
      const splTxRecord = await SplTokenSendTransaction.create(
        {
          senderPubkey: campaign.airdropWallet,
          receiverPubkey: userWallet,
          type: splType,
          txId: signature,
          tokenAddress: campaign.tokenAddress || null,
          decimals: campaign.tokenDecimals,
          uiAmount: String(parseFloat(reward.amount)),
          status: SPL_TOKEN_SEND_TX_STATUS?.CONFIRMED || 2,
          additionalJson: { purpose: "airdrop_claim", airdropRewardId: campaign.id },
        },
        { transaction }
      );

      // Mark the user reward as claimed
      await reward.update(
        {
          status: USER_REWARD_STATUS.CLAIMED,
          claimedAt: now,
          splTokenTxId: splTxRecord.id,
        },
        { transaction }
      );

      const claimingUser = await User.findOne({
        where: { pubkey: userWallet },
        attributes: ["id"],
        transaction,
      });

      // Xp claiming feature currently in works. If you uncomment this also uncomment below userTotalXp update code
      // await XpTable.create(
      //   {
      //     userId: claimingUser.id,
      //     xpEarned: -(parseFloat(reward.xp || 0)),
      //     usdValue: 0,
      //     splTokenSendTransactionId: splTxRecord.id,
      //     metadata: { purpose: "airdrop_claim", airdropRewardId: campaign.id },
      //   },
      //   { transaction }
      // );

      // If all user rewards are claimed, mark the campaign as completed
      const pendingCount = await UserAirdropReward.count({
        where: {
          airdropRewardId: campaign.id,
          status: { [Op.ne]: USER_REWARD_STATUS.CLAIMED },
        },
        transaction,
      });

      if (pendingCount === 0) {
        await campaign.update({ status: AIRDROP_STATUS.COMPLETED }, { transaction });
      }

      await transaction.commit();

      // try {
      //   await XpService.updateUserTotalXp(claimingUser.id);
      // } catch (xpErr) {
      //   logger.warn(`Could not update totalXp for user ${claimingUser.id} after airdrop claim: ${xpErr.message}`);
      // }

      // logger.info(`UserAirdropReward ${rewardId} claimed by wallet ${userWallet}, tx: ${signature}`);

      return respond(res, httpStatus.OK, "Reward claimed successfully", {
        rewardId: reward.id,
        transactionSignature: signature,
      });
    } catch (err) {
      await transaction.rollback();
      logger.error("Error claiming reward:", err);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, parseSequelizeErrors(err));
    }
  }
}

module.exports = AirdropController;
