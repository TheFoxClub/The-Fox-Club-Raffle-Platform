const {
  Raffle,
  RaffleDetail,
  User,
  UserInfo,
  RaffleReward,
  VerifiedCollection,
  RaffleTicket,
  SplTokenSendTransaction,
} = require("../models");
const { status: httpStatus, default: status } = require("http-status");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");
const { Op } = require("sequelize");
const {
  TOKEN_TYPE,
  RAFFLE_STATUS,
  RAFFLE_REWARD_TYPES,
  mapEnumValue,
  SPL_TOKEN_ADDRESS,
  SPL_TOKEN_SEND_TRANSACTION_TYPE,
  SPL_TOKEN_SEND_TX_STATUS,
} = require("../config/data");
const getFormattedDate = require("../util/getFormattedDate");
const {
  sendMultipleSplTokenTx,
  createClaimTransaction,
  createPayoutTransaction,
  submitTransactionToBlockchain,
} = require("../helpers/solana/spl-token-send-tx");
const logger = require("../util/logger");
const WinnerSelectionService = require("../services/raffles/winner-selection");
const { LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { MIN_PAYOUT_AMOUNT } = require("../config/constants");
const { BET_RECEIVER_WALLET } = require("../config/credentials");

class RaffleController {
  static async getLiveRaffles(req, res) {
    try {
      const raffles = await Raffle.findAll({
        where: {
          status: RAFFLE_STATUS.LIVE,
          endedAt: null,
        },
        include: [
          {
            model: RaffleDetail,
            attributes: [
              "isFeatured",
              "featuredPosition",
              "requiresNftVerification",
              "verifiedCollectionRequired",
            ],
          },
          {
            model: User,
            attributes: ["id", "pubkey"],
          },
          {
            model: RaffleReward,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const formattedRaffles = raffles.map((raffle) => {
        const data = raffle.get({ plain: true });

        data.tokenType = mapEnumValue(TOKEN_TYPE, data.tokenType);
        data.status = mapEnumValue(RAFFLE_STATUS, data.status);

        if (data.raffle_rewards) {
          data.raffle_rewards = data.raffle_rewards.map((reward) => ({
            ...reward,
            rewardType: mapEnumValue(TOKEN_TYPE, reward.rewardType),
          }));
        }

        return data;
      });

      return respond(
        res,
        httpStatus.OK,
        "Active raffles retrieved successfully",
        {
          // raffles,
          raffles: formattedRaffles,
        }
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

  static async getEndedRaffles(req, res) {
    try {
      const raffles = await Raffle.findAll({
        where: {
          status: RAFFLE_STATUS.ENDED,
        },
        include: [
          {
            model: RaffleDetail,
            attributes: [
              "isFeatured",
              "featuredPosition",
              "requiresNftVerification",
              "verifiedCollectionRequired",
            ],
          },
          {
            model: User,
            attributes: ["id", "pubkey"],
          },
          {
            model: RaffleReward,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const formattedRaffles = raffles.map((raffle) => {
        const data = raffle.get({ plain: true });

        data.tokenType = mapEnumValue(TOKEN_TYPE, data.tokenType);
        data.status = mapEnumValue(RAFFLE_STATUS, data.status);

        if (data.raffle_rewards) {
          data.raffle_rewards = data.raffle_rewards.map((reward) => ({
            ...reward,
            rewardType: mapEnumValue(TOKEN_TYPE, reward.rewardType),
          }));
        }

        return data;
      });

      return respond(
        res,
        httpStatus.OK,
        "Ended raffles retrieved successfully",
        {
          // raffles,
          raffles: formattedRaffles,
        }
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

  static async getUpcomingRaffles(req, res) {
    try {
      const raffles = await Raffle.findAll({
        where: {
          status: RAFFLE_STATUS.UPCOMING,
        },
        include: [
          {
            model: RaffleDetail,
            attributes: [
              "isFeatured",
              "featuredPosition",
              "requiresNftVerification",
              "verifiedCollectionRequired",
            ],
          },
          {
            model: User,
            attributes: ["id", "pubkey"],
          },
          {
            model: RaffleReward,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const formattedRaffles = raffles.map((raffle) => {
        const data = raffle.get({ plain: true });

        data.tokenType = mapEnumValue(TOKEN_TYPE, data.tokenType);
        data.status = mapEnumValue(RAFFLE_STATUS, data.status);

        if (data.raffle_rewards) {
          data.raffle_rewards = data.raffle_rewards.map((reward) => ({
            ...reward,
            rewardType: mapEnumValue(TOKEN_TYPE, reward.rewardType),
          }));
        }

        return data;
      });

      return respond(
        res,
        httpStatus.OK,
        "Upcoming raffles retrieved successfully",
        { raffles: formattedRaffles }
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

  static async getFeaturedRaffles(req, res) {
    try {
      const raffles = await Raffle.findAll({
        where: {
          endedAt: null,
        },
        include: [
          {
            model: RaffleDetail,
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
            attributes: ["id", "pubkey"],
          },
          {
            model: RaffleReward,
          },
        ],
        order: [[RaffleDetail, "featuredPosition", "ASC"]],
      });

      const formattedRaffles = raffles.map((raffle) => {
        const data = raffle.get({ plain: true });

        data.tokenType = mapEnumValue(TOKEN_TYPE, data.tokenType);
        data.status = mapEnumValue(RAFFLE_STATUS, data.status);

        if (data.raffle_rewards) {
          data.raffle_rewards = data.raffle_rewards.map((reward) => ({
            ...reward,
            rewardType: mapEnumValue(TOKEN_TYPE, reward.rewardType),
          }));
        }

        return data;
      });

      return respond(
        res,
        httpStatus.OK,
        "Featured raffles retrieved successfully",
        {
          // raffles,
          raffles: formattedRaffles,
        }
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

  static async getRaffleById(req, res) {
    try {
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
        include: [
          { model: RaffleDetail },
          {
            model: RaffleReward,
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
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      const userId = raffle.userId;

      const userData = await User.findOne({ where: { id: userId } });

      // Calculate progress percentage
      const progressPercentage =
        raffle.totalTickets > 0
          ? ((raffle.ticketsSold / raffle.totalTickets) * 100).toFixed(2)
          : 0;

      const winners = raffle.raffle_rewards
        .filter((reward) => reward.winnerId)
        .map((reward) => ({
          rewardId: reward.id,
          rewardName: reward.rewardName,
          rewardType: mapEnumValue(RAFFLE_REWARD_TYPES, reward.rewardType),
          mintAddress: reward.mintAddress,
          amount: reward.amount,
          imageUrl: reward.imageUrl,
          winnerId: reward.winnerId,
          winnerPubkey: reward.winner?.pubkey,
          ticketNumber: reward.winnerTicket?.ticketNumber,
          isClaimed: reward.isClaimed,
          claimedAt: null, // Will be fetched from claimTransaction if needed
        }));

      return respond(res, httpStatus.OK, "Raffle retrieved successfully", {
        raffle,
        userData,
        progressPercentage,
        winners,
        hasWinners: winners.length > 0,
        winnersSelected: raffle.winnersSelected,
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

  static async getRafflesByUserId(req, res) {
    try {
      const { userId } = req.params;

      const raffles = await Raffle.findAll({
        where: { userId },
        include: [
          {
            model: RaffleDetail,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return respond(
        res,
        httpStatus.OK,
        "User raffles retrieved successfully",
        {
          raffles,
        }
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

  static async createRaffle(req, res) {
    try {
      const userId = req.payload?.id;

      // Check for existing draft
      const existingDraft = await Raffle.findOne({
        where: {
          userId,
          status: RAFFLE_STATUS.DRAFT,
        },
      });

      if (existingDraft) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "You already have a draft raffle. Please edit or delete the existing draft before creating a new one."
        );
      }

      const {
        title,
        description,
        imageUrl,
        totalTickets,
        ticketPrice,
        tokenType,
        startDate,
        endDate,
        numberOfWinners,
        requiresNftVerification,
        verifiedCollectionRequired,
        additionalJson,
        rewards,
      } = req.body;

      const raffleStatus = req.body.status || RAFFLE_STATUS.UPCOMING;
      const statusEnum = RAFFLE_STATUS[raffleStatus] ?? RAFFLE_STATUS.UPCOMING;

      // Validate non-draft raffles
      if (statusEnum !== RAFFLE_STATUS.DRAFT) {
        if (!title || !totalTickets || !ticketPrice || !startDate || !endDate) {
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            "Missing required fields: title, totalTickets, ticketPrice, startDate, endDate"
          );
        }

        if (!Array.isArray(rewards) || rewards.length === 0) {
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            "At least one reward is required"
          );
        }

        if (new Date(startDate) >= new Date(endDate)) {
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            "Start date must be before end date"
          );
        }
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["pubkey"],
      });

      if (!user || !user.pubkey) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "User wallet not found. Please connect your wallet."
        );
      }

      if (!BET_RECEIVER_WALLET) {
        return respond(
          res,
          httpStatus.INTERNAL_SERVER_ERROR,
          "Bet Receiver wallet not configured"
        );
      }

      // Calculate number of winners
      let totalWinners = 1;
      if (numberOfWinners || rewards) {
        totalWinners = numberOfWinners || rewards.length;
      }

      if (rewards && rewards.length && totalWinners > rewards.length) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Number of winners (${totalWinners}) cannot be greater than total rewards (${rewards.length})`
        );
      }

      // For non-draft raffles, create reward transfer transaction
      if (statusEnum !== RAFFLE_STATUS.DRAFT && rewards && rewards.length > 0) {
        try {
          const splTokenSendSummary = rewards.map((reward, index) => {
            let type;
            let tokenAddress;
            let amount = reward.amount || 1;

            switch (reward.rewardType?.toUpperCase()) {
              case "NFT":
                type = RAFFLE_REWARD_TYPES.NFT;
                tokenAddress = reward.mintAddress;
                break;

              case "SPL_TOKEN":
                type = RAFFLE_REWARD_TYPES.SPL_TOKEN;
                tokenAddress = reward.mintAddress;
                break;

              case "SPL_TOKEN_2022":
                type = RAFFLE_REWARD_TYPES.SPL_TOKEN_2022;
                tokenAddress = reward.mintAddress;
                break;

              case "SOLANA":
                type = RAFFLE_REWARD_TYPES.SOLANA;
                tokenAddress = SPL_TOKEN_ADDRESS.SOLANA;
                break;

              default:
                // Default to SPL_TOKEN
                type = RAFFLE_REWARD_TYPES.SPL_TOKEN;
                tokenAddress = reward.mintAddress;
            }

            return {
              tokenAddress,
              toAccount: BET_RECEIVER_WALLET,
              amount,
              type,
              metadata: {
                rewardName: reward.rewardName,
                rewardType: reward.rewardType,
                rewardIndex: index,
              },
            };
          });

          logger.info(
            `Creating reward transfer transaction for ${splTokenSendSummary.length} rewards from user ${user.pubkey}`
          );

          // Create transaction for user to sign (but don't execute it yet)
          const transferResponse = await sendMultipleSplTokenTx({
            splTokenSendSummary,
            solCommission: 0,
            feePayer: user.pubkey,
            fromAccount: user.pubkey,
            isUserToPlatform: true,
          });

          if (!transferResponse.success) {
            logger.error(
              `Failed to create reward transfer transaction for user ${user.pubkey}:`,
              transferResponse.message
            );
            return respond(
              res,
              httpStatus.BAD_REQUEST,
              `Failed to create reward transfer transaction: ${transferResponse.message}`
            );
          }

          // Return transaction for user to sign
          return respond(
            res,
            httpStatus.OK,
            "Reward transfer transaction created",
            {
              requiresRewardTransfer: true,
              transaction: transferResponse.data.serializedTx,
              blockhash: transferResponse.data.blockhash,
              rewardTransferData: {
                rewards: rewards.map((reward, index) => ({
                  ...reward,
                  transferIndex: index,
                })),
                platformWallet: BET_RECEIVER_WALLET,
                totalRewards: rewards.length,
              },
              raffleData: {
                title,
                description,
                imageUrl,
                totalTickets,
                ticketPrice,
                tokenType,
                startDate,
                endDate,
                numberOfWinners: totalWinners,
                requiresNftVerification,
                verifiedCollectionRequired,
                additionalJson,
                status: raffleStatus,
              },
            }
          );
        } catch (transferError) {
          logger.error(
            "Failed to create reward transfer transaction:",
            transferError
          );
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            `Failed to create reward transfer transaction: ${transferError.message}`
          );
        }
      }

      // For draft raffles or raffles without rewards, create directly
      const raffle = await Raffle.create({
        userId,
        title,
        description,
        imageUrl: imageUrl || null,
        totalTickets: totalTickets || 0,
        ticketPrice: ticketPrice || 0,
        ticketsSold: 0,
        tokenType: TOKEN_TYPE[tokenType] || TOKEN_TYPE.SOLANA,
        numberOfWinners: totalWinners,
        startDate: startDate || getFormattedDate(3),
        endDate: endDate || getFormattedDate(10),
        status: statusEnum,
        platformWallet: BET_RECEIVER_WALLET,
      });

      // Create raffle details
      await RaffleDetail.create({
        raffleId: raffle.id,
        isFeatured: false,
        requiresNftVerification: requiresNftVerification || false,
        verifiedCollectionRequired: verifiedCollectionRequired || null,
        additionalJson: additionalJson || null,
      });

      // Create rewards (for draft raffles)
      if (rewards && rewards.length > 0) {
        const rewardsToInsert = rewards.map((reward) => ({
          raffleId: raffle.id,
          rewardType:
            RAFFLE_REWARD_TYPES[reward.rewardType] ||
            RAFFLE_REWARD_TYPES.SPL_TOKEN,
          rewardName: reward.rewardName,
          mintAddress: reward.mintAddress,
          amount: reward.amount || 1,
          imageUrl: reward.imageUrl,
          metadataJson: reward.metadataJson,
        }));

        await RaffleReward.bulkCreate(rewardsToInsert);
      }

      // Fetch complete raffle data
      const createdRaffle = await Raffle.findOne({
        where: { id: raffle.id },
        include: [
          { model: RaffleDetail },
          {
            model: RaffleReward,
            attributes: { exclude: ["createdAt", "updatedAt"] },
          },
        ],
      });

      const raffleData = createdRaffle.get({ plain: true });

      // Map enum values for frontend
      raffleData.tokenType = mapEnumValue(TOKEN_TYPE, raffleData.tokenType);
      raffleData.status = mapEnumValue(RAFFLE_STATUS, raffleData.status);

      if (raffleData.raffle_rewards) {
        raffleData.raffle_rewards = raffleData.raffle_rewards.map((reward) => ({
          ...reward,
          rewardType: mapEnumValue(RAFFLE_REWARD_TYPES, reward.rewardType),
        }));
      }

      logger.info(
        `Raffle created successfully: ${raffle.id} by user ${user.pubkey}`
      );

      return respond(res, httpStatus.OK, "Raffle created successfully", {
        raffle: raffleData,
        requiresRewardTransfer: false,
      });
    } catch (err) {
      logger.error("Error creating raffle:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  // Complete raffle creation after reward transfer signature

  static async completeRaffleCreation(req, res) {
    try {
      const userId = req.payload?.id;
      const { signedTransaction, raffleData, rewardTransferData } = req.body;

      if (!signedTransaction || !raffleData || !rewardTransferData) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Missing required data: signedTransaction, raffleData, or rewardTransferData"
        );
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["pubkey"],
      });

      if (!user || !user.pubkey) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "User wallet not found. Please connect your wallet."
        );
      }

      const {
        title,
        description,
        imageUrl,
        totalTickets,
        ticketPrice,
        tokenType,
        startDate,
        endDate,
        numberOfWinners,
        requiresNftVerification,
        verifiedCollectionRequired,
        additionalJson,
        status,
      } = raffleData;

      const { rewards, platformWallet } = rewardTransferData;

      const statusEnum = RAFFLE_STATUS[status] ?? RAFFLE_STATUS.UPCOMING;

      // Create the raffle first
      const raffle = await Raffle.create({
        userId,
        title,
        description,
        imageUrl: imageUrl || null,
        totalTickets: totalTickets || 0,
        ticketPrice: ticketPrice || 0,
        ticketsSold: 0,
        tokenType: TOKEN_TYPE[tokenType] || TOKEN_TYPE.SOLANA,
        numberOfWinners: numberOfWinners || 1,
        startDate: startDate || getFormattedDate(3),
        endDate: endDate || getFormattedDate(10),
        status: statusEnum,
        platformWallet: platformWallet,
      });

      // Create raffle details
      await RaffleDetail.create({
        raffleId: raffle.id,
        isFeatured: false,
        requiresNftVerification: requiresNftVerification || false,
        verifiedCollectionRequired: verifiedCollectionRequired || null,
        additionalJson: additionalJson || null,
      });

      // Create rewards without transfer information (will be updated by cron job)
      if (rewards && rewards.length > 0) {
        const rewardsToInsert = rewards.map((reward) => ({
          raffleId: raffle.id,
          rewardType:
            RAFFLE_REWARD_TYPES[reward.rewardType] ||
            RAFFLE_REWARD_TYPES.SPL_TOKEN,
          rewardName: reward.rewardName,
          mintAddress: reward.mintAddress,
          amount: reward.amount || 1,
          imageUrl: reward.imageUrl,
          metadataJson: reward.metadataJson,
          // Status tracking only
          isClaimed: false,
        }));

        await RaffleReward.bulkCreate(rewardsToInsert);
      }

      // Return the signed transaction for the frontend to submit
      return respond(
        res,
        httpStatus.OK,
        "Raffle created, please submit transaction",
        {
          raffle: {
            id: raffle.id,
            title: raffle.title,
          },
          signedTransaction,
          submitEndpoint: "/raffle/store-reward-signature",
          raffleId: raffle.id,
        }
      );
    } catch (err) {
      logger.error("Error completing raffle creation:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  // Store reward transfer signature
  static async storeRewardSignature(req, res) {
    try {
      const userId = req.payload?.id;
      const { signature, raffleId, rewardTransferData } = req.body;

      if (!signature || !raffleId || !rewardTransferData) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Missing required data: signature, raffleId, or rewardTransferData"
        );
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["pubkey"],
      });

      if (!user || !user.pubkey) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "User wallet not found. Please connect your wallet."
        );
      }

      const { rewards, platformWallet } = rewardTransferData;

      // Create SplTokenSendTransaction records for each reward
      const splTokenSendTxRecords = [];

      for (let i = 0; i < rewards.length; i++) {
        const reward = rewards[i];
        let tokenType;
        let tokenAddress = reward.mintAddress;
        let uiAmount = reward.amount || 1;
        let tokenDecimals = 0;

        // Determine token type and get proper decimals
        switch (reward.rewardType?.toUpperCase()) {
          case "NFT":
            tokenType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN; // NFTs use SPL_TOKEN type
            uiAmount = 1; // NFTs are always 1
            tokenDecimals = 0; // NFTs don't have decimals
            break;
          case "SPL_TOKEN":
            tokenType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN;
            // Get actual token decimals
            try {
              const {
                getTokenDetail,
              } = require("../helpers/solana/token-program");
              const tokenDetail = await getTokenDetail(reward.mintAddress);
              tokenDecimals = tokenDetail.decimals || 0;
            } catch (tokenError) {
              logger.warn(
                `Could not fetch token details for ${reward.mintAddress}, using 0 decimals`
              );
              tokenDecimals = 0;
            }
            break;
          case "SPL_TOKEN_2022":
            tokenType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN_2022;
            // Get actual token decimals
            try {
              const {
                getTokenDetail,
              } = require("../helpers/solana/token-program");
              const tokenDetail = await getTokenDetail(reward.mintAddress);
              tokenDecimals = tokenDetail.decimals || 0;
            } catch (tokenError) {
              logger.warn(
                `Could not fetch token details for ${reward.mintAddress}, using 0 decimals`
              );
              tokenDecimals = 0;
            }
            break;
          case "SOLANA":
            tokenType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA;
            tokenAddress = SPL_TOKEN_ADDRESS.SOLANA;
            tokenDecimals = 9;
            break;
          default:
            tokenType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN;
            // Try to get token decimals for unknown type
            if (reward.mintAddress) {
              try {
                const {
                  getTokenDetail,
                } = require("../helpers/solana/token-program");
                const tokenDetail = await getTokenDetail(reward.mintAddress);
                tokenDecimals = tokenDetail.decimals || 0;
              } catch (tokenError) {
                logger.warn(
                  `Could not fetch token details for ${reward.mintAddress}, using 0 decimals`
                );
                tokenDecimals = 0;
              }
            }
        }

        const uiAmountInSmallestUnits = Math.round(
          uiAmount * Math.pow(10, tokenDecimals)
        );

        const splTokenSendTxData = {
          senderPubkey: user.pubkey,
          receiverPubkey: platformWallet,
          type: tokenType,
          txId: signature,
          tokenAddress: tokenAddress,
          decimals: tokenDecimals,
          uiAmount: uiAmountInSmallestUnits.toString(),
          status: SPL_TOKEN_SEND_TX_STATUS.PENDING,
          commissionRate: 0, // No commission for reward transfers
          creatorAmount: 0,
          commissionAmount: 0,
          isNFTHolder: false,
          // Additional fields for reward tracking
          raffleId: raffleId,
          rewardTransferType: "raffle_creation",
          rewardName: reward.rewardName,
          rewardIndex: reward.transferIndex || i,
        };

        const splTokenSendTxDb = await SplTokenSendTransaction.create(
          splTokenSendTxData
        );
        splTokenSendTxRecords.push(splTokenSendTxDb);
      }

      // Update RaffleReward records to link to the transaction records
      const raffleRewards = await RaffleReward.findAll({
        where: { raffleId: raffleId },
        order: [["id", "ASC"]],
      });

      // Link each reward to its corresponding transaction record
      for (
        let i = 0;
        i < raffleRewards.length && i < splTokenSendTxRecords.length;
        i++
      ) {
        await RaffleReward.update(
          {
            splTokenTransferTxId: splTokenSendTxRecords[i].id,
          },
          {
            where: { id: raffleRewards[i].id },
          }
        );
      }

      const createdRaffle = await Raffle.findOne({
        where: { id: raffleId },
        include: [
          { model: RaffleDetail },
          {
            model: RaffleReward,
            attributes: { exclude: ["createdAt", "updatedAt"] },
          },
        ],
      });

      const raffleDataResponse = createdRaffle.get({ plain: true });

      raffleDataResponse.tokenType = mapEnumValue(
        TOKEN_TYPE,
        raffleDataResponse.tokenType
      );
      raffleDataResponse.status = mapEnumValue(
        RAFFLE_STATUS,
        raffleDataResponse.status
      );

      if (raffleDataResponse.raffle_rewards) {
        raffleDataResponse.raffle_rewards =
          raffleDataResponse.raffle_rewards.map((reward) => ({
            ...reward,
            rewardType: mapEnumValue(RAFFLE_REWARD_TYPES, reward.rewardType),
          }));
      }

      logger.info(
        `Reward transfer signature stored for raffle ${raffleId} by user ${user.pubkey}, signature: ${signature}`
      );

      return respond(
        res,
        httpStatus.OK,
        "Raffle created successfully with reward transfer",
        {
          raffle: raffleDataResponse,
          transferInfo: {
            success: true,
            direction: "user_to_platform",
            timestamp: new Date(),
            signature: signature,
            platformWallet: platformWallet,
            transactionRecords: splTokenSendTxRecords.length,
          },
        }
      );
    } catch (err) {
      logger.error("Error storing reward signature:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  /**
   * Claim reward (platform wallet → winner)
   * Returns transaction for user to sign (user pays fees, platform pre-signs)
   */
  static async claimReward(req, res) {
    try {
      const userId = req.payload?.id;
      const { raffleId, rewardId } = req.body;

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["pubkey"],
      });

      if (!user || !user.pubkey) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "User wallet not found. Please connect your wallet."
        );
      }

      const raffle = await Raffle.findOne({
        where: { id: raffleId },
        include: [
          {
            model: RaffleReward,
            where: { id: rewardId },
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      const reward = raffle.raffle_rewards[0];

      if (!reward) {
        return respond(res, httpStatus.NOT_FOUND, "Reward not found");
      }

      if (reward.isClaimed) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "This reward has already been claimed"
        );
      }

      // Check if raffle has ended (manually ended OR naturally ended by reaching endDate)
      const hasEnded =
        raffle.status === RAFFLE_STATUS.ENDED ||
        raffle.endedAt ||
        (raffle.endDate && new Date() > new Date(raffle.endDate));

      if (!hasEnded) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Rewards can only be claimed after the raffle has ended"
        );
      }

      if (reward.winnerId !== userId) {
        return respond(
          res,
          httpStatus.FORBIDDEN,
          "You are not a winner of this reward"
        );
      }

      if (!raffle.platformWallet) {
        return respond(
          res,
          httpStatus.INTERNAL_SERVER_ERROR,
          "Platform wallet not configured for this raffle"
        );
      }

      // Prepare transfer from platform to winner
      let type;
      let tokenAddress = reward.mintAddress;
      let amount = reward.amount || 1;

      switch (reward.rewardType) {
        case RAFFLE_REWARD_TYPES.NFT:
          type = RAFFLE_REWARD_TYPES.NFT;
          break;
        case RAFFLE_REWARD_TYPES.SPL_TOKEN:
          type = RAFFLE_REWARD_TYPES.SPL_TOKEN;
          break;
        case RAFFLE_REWARD_TYPES.SPL_TOKEN_2022:
          type = RAFFLE_REWARD_TYPES.SPL_TOKEN_2022;
          break;
        case RAFFLE_REWARD_TYPES.SOLANA:
          type = RAFFLE_REWARD_TYPES.SOLANA;
          tokenAddress = SPL_TOKEN_ADDRESS.SOLANA;
          break;
        default:
          type = RAFFLE_REWARD_TYPES.SPL_TOKEN;
      }

      // Prepare transfer summary
      const splTokenSendSummary = [
        {
          tokenAddress,
          toAccount: user.pubkey,
          amount,
          type,
          metadata: {
            rewardName: reward.rewardName,
            rewardId: reward.id,
            raffleId: raffle.id,
          },
        },
      ];

      logger.info(
        `Creating claim transaction for reward ${reward.id} to winner ${user.pubkey}`
      );

      // Create transaction with platform pre-signing and user as fee payer
      const transferResponse = await createClaimTransaction({
        reward: {
          tokenAddress,
          amount,
          type,
        },
        toAccount: user.pubkey,
        fromAccount: raffle.platformWallet,
        feePayer: user.pubkey,
      });

      if (!transferResponse.success) {
        logger.error(
          `Failed to create claim transaction for user ${user.pubkey}:`,
          transferResponse.message
        );
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Failed to create claim transaction: ${transferResponse.message}`
        );
      }

      // Generate checksum for verification
      const checksum = `${raffleId}-${rewardId}-${userId}-${Date.now()}`;

      logger.info(
        `Claim transaction created for reward ${reward.id} by user ${user.pubkey}`
      );

      return respond(res, httpStatus.OK, "Claim transaction created", {
        transaction: transferResponse.data.serializedTx,
        blockhash: transferResponse.data.blockhash,
        checksum,
        rewardInfo: {
          id: reward.id,
          name: reward.rewardName,
          type: mapEnumValue(RAFFLE_REWARD_TYPES, reward.rewardType),
          amount: reward.amount,
        },
      });
    } catch (err) {
      logger.error("Error creating claim transaction:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  /**
   * Submit signed claim transaction
   */
  static async submitClaim(req, res) {
    try {
      const userId = req.payload?.id;
      const { signedTransaction, checksum, raffleId, rewardId } = req.body;

      if (!signedTransaction || !checksum || !raffleId || !rewardId) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Missing required data: signedTransaction, checksum, raffleId, or rewardId"
        );
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["pubkey"],
      });

      if (!user || !user.pubkey) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "User wallet not found. Please connect your wallet."
        );
      }

      // Verify the reward still exists and is claimable
      const reward = await RaffleReward.findOne({
        where: {
          id: rewardId,
          winnerId: userId,
          isClaimed: false,
          raffleId: raffleId, // Ensure it belongs to the correct raffle
        },
      });

      if (!reward) {
        return respond(
          res,
          httpStatus.NOT_FOUND,
          "Reward not found or already claimed"
        );
      }

      const raffle = await Raffle.findOne({
        where: { id: raffleId },
        attributes: ["id", "status"],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      // Check if raffle has ended (manually ended OR naturally ended by reaching endDate)
      const hasEnded =
        raffle.status === RAFFLE_STATUS.ENDED ||
        raffle.endedAt ||
        (raffle.endDate && new Date() > new Date(raffle.endDate));

      if (!hasEnded) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Raffle must be ended to claim rewards"
        );
      }

      try {
        const submissionResult = await submitTransactionToBlockchain(
          signedTransaction
        );

        if (!submissionResult.success) {
          throw new Error(
            `Transaction submission failed: ${submissionResult.error}`
          );
        }

        const signature = submissionResult.signature;

        let tokenDecimals = 9; // Default for SOL
        let calculatedUiAmount = reward.amount || 1;

        if (
          reward.rewardType !== RAFFLE_REWARD_TYPES.SOLANA &&
          reward.mintAddress
        ) {
          try {
            const {
              getTokenDetail,
            } = require("../helpers/solana/token-program");
            const tokenDetail = await getTokenDetail(reward.mintAddress);
            tokenDecimals = tokenDetail.decimals || 0;
          } catch (tokenError) {
            logger.warn(
              `Could not fetch token details for ${reward.mintAddress}, using default decimals`
            );
            tokenDecimals = 0; // Default for unknown tokens
          }
        }

        const uiAmountInSmallestUnits = Math.round(
          calculatedUiAmount * Math.pow(10, tokenDecimals)
        );

        const splTokenSendTxData = {
          senderPubkey: raffle.platformWallet || BET_RECEIVER_WALLET,
          receiverPubkey: user.pubkey,
          type:
            reward.rewardType === RAFFLE_REWARD_TYPES.SOLANA
              ? SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA
              : SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN,
          txId: signature,
          tokenAddress: reward.mintAddress || "",
          decimals: tokenDecimals,
          uiAmount: uiAmountInSmallestUnits.toString(),
          status: SPL_TOKEN_SEND_TX_STATUS.PENDING,
          raffleId: raffleId,
          rewardTransferType: "reward_claim",
          rewardName: reward.rewardName,
          rewardIndex: 0,
        };

        const splTokenSendTxRecord = await SplTokenSendTransaction.create(
          splTokenSendTxData
        );

        // Update reward with claim information and transaction reference
        await RaffleReward.update(
          {
            isClaimed: true,
            splTokenClaimTxId: splTokenSendTxRecord.id,
          },
          {
            where: { id: rewardId },
          }
        );

        logger.info(
          `Reward ${rewardId} successfully claimed by user ${user.pubkey} with signature ${signature}`
        );

        return respond(res, httpStatus.OK, "Reward claimed successfully", {
          success: true,
          signature: signature,
          rewardId: reward.id,
          claimedAt: new Date().toISOString(),
          transactionId: splTokenSendTxRecord.id,
        });
      } catch (submissionError) {
        logger.error("Error submitting claim transaction:", submissionError);
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Failed to submit claim transaction: ${submissionError.message}`
        );
      }
    } catch (err) {
      logger.error("Error processing claim submission:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  /**
   * Get claimable rewards for a user
   */
  static async getClaimableRewards(req, res) {
    try {
      const userId = req.payload?.id;

      // Get all rewards where user is a winner and hasn't claimed yet
      const claimableRewards = await RaffleReward.findAll({
        where: {
          winnerId: userId,
          isClaimed: false,
        },
        include: [
          {
            model: Raffle,
            where: {
              status: RAFFLE_STATUS.ENDED,
            },
            attributes: ["id", "title", "imageUrl", "endedAt"],
            required: true,
          },
        ],
      });

      const formattedRewards = claimableRewards.map((reward) => ({
        id: reward.id,
        raffleId: reward.raffleId,
        raffleTitle: reward.Raffle?.title || "Unknown Raffle",
        rewardName: reward.rewardName,
        rewardType: mapEnumValue(RAFFLE_REWARD_TYPES, reward.rewardType),
        mintAddress: reward.mintAddress,
        amount: parseFloat(reward.amount),
        imageUrl: reward.imageUrl,
        isClaimed: reward.isClaimed,
        claimedAt: null, // Will be fetched from claimTransaction if needed
      }));

      return respond(res, httpStatus.OK, "Claimable rewards retrieved", {
        rewards: formattedRewards,
        totalClaimable: formattedRewards.length,
      });
    } catch (err) {
      logger.error("Error getting claimable rewards:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async updateRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
          },
        ],
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

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
      if (numberOfWinners !== undefined)
        raffle.numberOfWinners = numberOfWinners;
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
        if (additionalJson !== undefined)
          detail.additionalJson = additionalJson;
        await detail.save();
      }

      const updatedRaffle = await Raffle.findOne({
        where: { id },
        include: [
          {
            model: RaffleDetail,
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

  static async deleteRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

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

      await RaffleDetail.destroy({
        where: { raffleId: id },
      });

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

  static async endRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

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

  static async filterRaffles(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const { status, tokenType, price, collection, search = "" } = req.query;

      let whereClause = {
        status: { [Op.ne]: RAFFLE_STATUS.DRAFT },
      };

      // Filter by status
      if (status) {
        const statusMap = {
          live: RAFFLE_STATUS.LIVE,
          ended: RAFFLE_STATUS.ENDED,
          upcoming: RAFFLE_STATUS.UPCOMING,
        };
        if (statusMap[status.toLowerCase()] !== undefined) {
          whereClause.status = statusMap[status.toLowerCase()];
        }
      }

      // Filter by token type
      if (tokenType && tokenType !== "all") {
        const tokenMap = {
          sol: TOKEN_TYPE.SOLANA,
          usdc: TOKEN_TYPE.USDC,
          token: TOKEN_TYPE.SPL_TOKEN,
        };
        if (tokenMap[tokenType.toLowerCase()] !== undefined) {
          whereClause.tokenType = tokenMap[tokenType.toLowerCase()];
        }
      }

      // Search by title
      if (search) {
        whereClause.title = { [Op.like]: `%${search}%` };
      }

      // Prepare include array
      let include = [
        { model: RaffleDetail, required: false },
        { model: User, attributes: ["id", "pubkey"], required: false },
        { model: RaffleReward, required: false },
      ];

      // Filter by verified collection
      if (collection === "verified") {
        const verifiedAddresses = await VerifiedCollection.findAll({
          attributes: ["address"],
        });
        const addresses = verifiedAddresses.map((v) => v.address);

        // Override RaffleDetail include to add where clause
        include = include.map((inc) => {
          if (inc.model === RaffleDetail) {
            return {
              ...inc,
              required: true, // must join to filter
              where: {
                verifiedCollectionRequired: { [Op.in]: addresses },
              },
            };
          }
          return inc;
        });
      }

      // Determine order
      let order = [["createdAt", "DESC"]];
      if (price === "lowtohigh") order = [["ticketPrice", "ASC"]];
      if (price === "hightolow") order = [["ticketPrice", "DESC"]];

      // Query raffles
      const { count, rows: raffles } = await Raffle.findAndCountAll({
        where: whereClause,
        include,
        order,
        limit,
        offset,
      });

      const formattedRaffles = raffles.map((raffle) => {
        const data = raffle.get({ plain: true });

        data.tokenType = mapEnumValue(TOKEN_TYPE, data.tokenType);
        data.status = mapEnumValue(RAFFLE_STATUS, data.status);

        if (data.raffle_rewards) {
          data.raffle_rewards = data.raffle_rewards.map((reward) => ({
            ...reward,
            rewardType: mapEnumValue(TOKEN_TYPE, reward.rewardType),
          }));
        }

        return data;
      });

      return respond(res, httpStatus.OK, "Raffles retrieved successfully", {
        formattedRaffles,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (err) {
      logger.error(err);
      return respond(res, httpStatus.INTERNAL_SERVER_ERROR, err.message);
    }
  }

  static async getRaffleDraft(req, res) {
    try {
      const userId = req.payload?.id;

      const userData = await User.findOne({ where: { id: userId } });

      const raffle = await Raffle.findOne({
        where: { userId, status: RAFFLE_STATUS.DRAFT },
        include: [{ model: RaffleDetail }, { model: RaffleReward }],
      });

      if (raffle) {
        raffle.tokenType = mapEnumValue(TOKEN_TYPE, raffle.tokenType);
        raffle.status = mapEnumValue(RAFFLE_STATUS, raffle.status);

        raffle.raffle_rewards = raffle.raffle_rewards.map((reward) => ({
          ...reward,
          rewardType: mapEnumValue(TOKEN_TYPE, reward.rewardType),
        }));
      }

      return respond(res, httpStatus.OK, "Raffle retrieved successfully", {
        raffle,
        userData,
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

  static async updateDraftRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { raffleId } = req.params;

      const draft = await Raffle.findOne({
        where: { id: raffleId, userId, status: RAFFLE_STATUS.DRAFT },
        include: [{ model: RaffleDetail }, { model: RaffleReward }],
      });

      if (!draft) {
        return respond(res, httpStatus.NOT_FOUND, "Draft raffle not found");
      }

      const {
        title,
        description,
        imageUrl,
        totalTickets,
        ticketPrice,
        startDate,
        endDate,
        numberOfWinners,
        requiresNftVerification,
        verifiedCollectionRequired,
        additionalJson,
        rewards,
        tokenType,
      } = req.body;

      await draft.update({
        title: title ?? draft.title,
        description: description ?? draft.description,
        imageUrl: imageUrl ?? draft.imageUrl,
        totalTickets: totalTickets ?? draft.totalTickets,
        ticketPrice: ticketPrice ?? draft.ticketPrice,
        startDate: startDate ?? draft.startDate,
        endDate: endDate ?? draft.endDate,
        numberOfWinners: numberOfWinners ?? draft.numberOfWinners,
        tokenType: tokenType ? TOKEN_TYPE[tokenType] : draft.tokenType,
      });

      await draft.raffle_detail.update({
        requiresNftVerification:
          requiresNftVerification ??
          draft.raffle_detail.requiresNftVerification,
        verifiedCollectionRequired:
          verifiedCollectionRequired ??
          draft.raffle_detail.verifiedCollectionRequired,
        additionalJson: additionalJson ?? draft.raffle_detail.additionalJson,
      });

      if (Array.isArray(rewards)) {
        await RaffleReward.destroy({ where: { raffleId } });

        const rewardsToInsert = rewards.map((r) => ({
          raffleId,
          rewardType: RAFFLE_REWARD_TYPES[r.rewardType],
          rewardName: r.rewardName,
          mintAddress: r.mintAddress,
          amount: r.amount,
        }));

        await RaffleReward.bulkCreate(rewardsToInsert);
      }

      return respond(res, httpStatus.OK, "Draft Raffle Updated Successfully");
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  static async deleteDraftRaffle(req, res) {
    try {
      const userId = req.payload?.id;
      const { raffleId } = req.params;

      const draft = await Raffle.findOne({
        where: { id: raffleId, userId, status: RAFFLE_STATUS.DRAFT },
      });

      if (!draft) {
        return respond(res, httpStatus.NOT_FOUND, "Draft Raffle Not Found");
      }

      await RaffleDetail.destroy({ where: { raffleId } });
      await RaffleReward.destroy({ where: { raffleId } });

      await draft.destroy();

      return respond(res, httpStatus.OK, "Draft Raffle Deleted Successfully");
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
   * Manually select winners for a raffle (admin/owner only)
   */
  static async selectWinners(req, res) {
    try {
      const userId = req.payload?.id;
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      if (raffle.userId !== userId) {
        return respond(
          res,
          httpStatus.FORBIDDEN,
          "You are not authorized to select winners for this raffle"
        );
      }

      // Check if raffle has ended (manually ended OR naturally ended by reaching endDate)
      const hasEnded =
        raffle.status === RAFFLE_STATUS.ENDED ||
        raffle.endedAt ||
        (raffle.endDate && new Date() > new Date(raffle.endDate));

      if (!hasEnded) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Raffle must be ended before selecting winners"
        );
      }

      const result = await WinnerSelectionService.selectWinners(id);

      return respond(res, httpStatus.OK, "Winners selected successfully", {
        result,
      });
    } catch (err) {
      logger.error("Error selecting winners:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        err.message || parseSequelizeErrors(err)
      );
    }
  }

  /**
   * Get winners for a raffle
   */
  static async getRaffleWinners(req, res) {
    try {
      const { id } = req.params;

      const raffle = await Raffle.findOne({
        where: { id },
      });

      if (!raffle) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      const winners = await WinnerSelectionService.getWinners(id);

      return respond(res, httpStatus.OK, "Winners retrieved successfully", {
        raffleId: id,
        winners,
        winnersSelected: raffle.winnersSelected,
        winnersSelectedAt: raffle.winnersSelectedAt,
      });
    } catch (err) {
      logger.error("Error getting raffle winners:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  /**
   * Get user's wins across all raffles
   */
  static async getUserWins(req, res) {
    try {
      const userId = req.payload?.id;

      // Get all rewards where user is a winner (both claimed and unclaimed)
      const userWins = await RaffleReward.findAll({
        where: {
          winnerId: userId,
        },
        include: [
          {
            model: Raffle,
            attributes: ["id", "title", "imageUrl", "endedAt", "status"],
            required: true,
          },
          {
            model: RaffleTicket,
            as: "winnerTicket",
            attributes: ["id", "ticketNumber"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      // Format wins for frontend
      const formattedWins = userWins.map((win) => ({
        id: win.id,
        raffleId: win.raffleId,
        raffleTitle: win.raffle?.title || "Unknown Raffle",
        rewardId: win.id,
        rewardName: win.rewardName,
        rewardType: mapEnumValue(RAFFLE_REWARD_TYPES, win.rewardType),
        mintAddress: win.mintAddress,
        amount: parseFloat(win.amount),
        imageUrl: win.imageUrl,
        isClaimed: win.isClaimed,
        claimedAt: null, // Will be fetched from claimTransaction if needed
        winDate: win.raffle?.endedAt || win.createdAt,
        ticketNumber: win.winnerTicket?.ticketNumber,
        raffleStatus: mapEnumValue(RAFFLE_STATUS, win.raffle?.status),
      }));

      return respond(res, httpStatus.OK, "User wins retrieved successfully", {
        wins: formattedWins,
        totalWins: formattedWins.length,
      });
    } catch (err) {
      logger.error("Error getting user wins:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  /**
   * Get user's hosted raffles with payout information
   */
  static async getUserHostedRaffles(req, res) {
    try {
      const userId = req.payload?.id;

      const hostedRaffles = await Raffle.findAll({
        where: {
          userId: userId,
        },
        include: [
          {
            model: RaffleDetail,
            attributes: ["isFeatured", "requiresNftVerification"],
          },
          {
            model: SplTokenSendTransaction,
            as: "creatorClaimTransaction",
            attributes: ["id", "txId", "status", "createdAt"],
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      // Format raffles with payout information
      const formattedRaffles = hostedRaffles.map((raffle) => {
        const data = raffle.get({ plain: true });

        // Calculate payout information
        const totalRevenue = parseFloat(data.totalRevenue || 0);
        const totalCommission = parseFloat(data.totalCommission || 0);
        const claimableAmount = parseFloat(data.claimableAmount || 0);
        const claimedAmount = parseFloat(data.claimedAmount || 0);
        const unclaimedAmount = claimableAmount - claimedAmount;

        // Check if raffle has ended (manually ended OR naturally ended by reaching endDate)
        const hasEnded =
          data.status === RAFFLE_STATUS.ENDED ||
          data.endedAt ||
          (data.endDate && new Date() > new Date(data.endDate));

        const hasClaimed = !!data.creatorClaimTxId;
        const claimTransaction = data.creatorClaimTransaction;

        let claimStatus = "not_claimed";
        if (hasClaimed && claimTransaction) {
          switch (claimTransaction.status) {
            case SPL_TOKEN_SEND_TX_STATUS.PENDING:
              claimStatus = "pending";
              break;
            case SPL_TOKEN_SEND_TX_STATUS.FAILED:
              claimStatus = "failed";
              break;
            case SPL_TOKEN_SEND_TX_STATUS.SUCCESS:
              claimStatus = "confirmed";
              break;
            case SPL_TOKEN_SEND_TX_STATUS.MISMATCHED:
              claimStatus = "failed";
              break;
            default:
              claimStatus = "unknown";
          }
        }

        return {
          ...data,
          tokenType: mapEnumValue(TOKEN_TYPE, data.tokenType),
          status: mapEnumValue(RAFFLE_STATUS, data.status),
          payoutInfo: {
            totalRevenue: totalRevenue,
            totalCommission: totalCommission,
            claimableAmount: claimableAmount,
            claimedAmount: claimedAmount,
            unclaimedAmount: Math.max(0, unclaimedAmount), // Ensure non-negative
            canClaim: hasEnded && !hasClaimed && unclaimedAmount > 0,
            hasEnded: hasEnded,
            hasClaimed: hasClaimed,
            claimStatus: claimStatus,
            claimTransactionId: data.creatorClaimTxId,
            claimSignature: claimTransaction?.txId || null,
            message: !hasEnded
              ? "You can claim the revenue generated from the raffle only after it ends"
              : hasClaimed
              ? `Payout ${
                  claimStatus === "confirmed" ? "completed" : claimStatus
                }`
              : unclaimedAmount > 0
              ? "Ready to claim"
              : "No amount available to claim",
          },
        };
      });

      return respond(
        res,
        httpStatus.OK,
        "Hosted raffles retrieved successfully",
        {
          raffles: formattedRaffles,
          totalRaffles: formattedRaffles.length,
        }
      );
    } catch (err) {
      logger.error("Error getting user hosted raffles:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        parseSequelizeErrors(err)
      );
    }
  }

  /**
   * Claim raffle creator payout with security measures
   */
  static async claimCreatorPayout(req, res) {
    const transaction = await require("../models").sequelize.transaction();

    try {
      const userId = req.payload?.id;
      const { raffleId } = req.body;

      if (!raffleId) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return respond(res, httpStatus.BAD_REQUEST, "Raffle ID is required");
      }

      // Validate raffleId is a number
      const raffleIdNum = parseInt(raffleId);
      if (isNaN(raffleIdNum) || raffleIdNum <= 0) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return respond(res, httpStatus.BAD_REQUEST, "Invalid raffle ID");
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["pubkey"],
      });

      if (!user || !user.pubkey) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "User wallet not found. Please connect your wallet."
        );
      }

      // Get raffle with row-level locking to prevent race conditions
      const raffle = await Raffle.findOne({
        where: {
          id: raffleIdNum,
          userId: userId, // Ensure user owns the raffle
        },
        lock: true, // Row-level lock to prevent concurrent modifications
        transaction: transaction,
      });

      if (!raffle) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return respond(
          res,
          httpStatus.NOT_FOUND,
          "Raffle not found or you don't have permission to claim from this raffle"
        );
      }

      // Security checks - Raffle must be ended (manually ended OR naturally ended by reaching endDate)
      const hasEnded =
        raffle.status === RAFFLE_STATUS.ENDED ||
        raffle.endedAt ||
        (raffle.endDate && new Date() > new Date(raffle.endDate));

      if (!hasEnded) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "You can claim the revenue generated from the raffle only after it ends"
        );
      }

      // Check if already claimed
      if (raffle.creatorClaimTxId) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Payout has already been claimed for this raffle"
        );
      }

      const claimableAmount = parseFloat(raffle.claimableAmount || 0);
      const claimedAmount = parseFloat(raffle.claimedAmount || 0);
      const unclaimedAmount = claimableAmount - claimedAmount;

      if (unclaimedAmount <= 0) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "No unclaimed amount available for this raffle"
        );
      }

      if (unclaimedAmount < MIN_PAYOUT_AMOUNT) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Minimum payout amount is ${MIN_PAYOUT_AMOUNT} SOL`
        );
      }

      // Check if platform wallet has sufficient balance (basic validation)
      const platformWallet = BET_RECEIVER_WALLET;
      if (!platformWallet) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return respond(
          res,
          httpStatus.INTERNAL_SERVER_ERROR,
          "Platform wallet not configured"
        );
      }

      logger.info(
        `Creating payout transaction for raffle ${raffleIdNum} to creator ${user.pubkey}, amount: ${unclaimedAmount}`
      );

      // Create pre-signed payout transaction (platform signs, user pays fees)
      const payoutResponse = await createPayoutTransaction({
        amount: unclaimedAmount,
        toAccount: user.pubkey,
        fromAccount: platformWallet,
        feePayer: user.pubkey, // User pays transaction fees
      });

      if (!payoutResponse.success) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        logger.error(
          `Failed to create payout transaction for raffle ${raffleIdNum}:`,
          payoutResponse.message
        );
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Failed to create payout transaction: ${payoutResponse.message}`
        );
      }

      // Create SplTokenSendTransaction record with PENDING status
      const splTokenSendTxData = {
        senderPubkey: platformWallet,
        receiverPubkey: user.pubkey,
        type: SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA,
        txId: null,
        tokenAddress: SPL_TOKEN_ADDRESS.SOLANA,
        decimals: 9,
        uiAmount: Math.round(unclaimedAmount * LAMPORTS_PER_SOL).toString(),
        status: SPL_TOKEN_SEND_TX_STATUS.PENDING,
        raffleId: raffleIdNum,
        rewardTransferType: "creator_payout",
        rewardName: `Payout for ${raffle.title}`,
        rewardIndex: 0,
        commissionRate: 0,
        creatorAmount: 0,
        commissionAmount: 0,
        isNFTHolder: false,
      };

      const payoutTxRecord = await SplTokenSendTransaction.create(
        splTokenSendTxData,
        { transaction }
      );

      await Raffle.update(
        {
          creatorClaimTxId: payoutTxRecord.id,
        },
        {
          where: { id: raffleIdNum },
          transaction: transaction,
        }
      );

      await transaction.commit();

      logger.info(
        `Payout transaction created for raffle ${raffleIdNum} to creator ${user.pubkey}, amount: ${unclaimedAmount}. Transaction ID: ${payoutTxRecord.id}`
      );

      return respond(
        res,
        httpStatus.OK,
        "Payout transaction created, please sign and submit",
        {
          success: true,
          requiresSubmission: true,
          transaction: payoutResponse.data.serializedTx,
          blockhash: payoutResponse.data.blockhash,
          raffleId: raffleIdNum,
          payoutAmount: unclaimedAmount,
          transactionId: payoutTxRecord.id,
          submitEndpoint: "/raffle/payout/submit",
          rewardInfo: {
            id: payoutTxRecord.id,
            name: `Payout for ${raffle.title}`,
            type: "SOLANA",
            amount: unclaimedAmount,
          },
        }
      );
    } catch (err) {
      // Only rollback if transaction is still active
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      logger.error("Error claiming creator payout:", err);

      if (err.message.includes("insufficient funds")) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Insufficient funds in platform wallet to process payout"
        );
      }

      if (err.message.includes("blockhash")) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Transaction expired. Please try again."
        );
      }

      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "An error occurred while processing your payout. Please try again later."
      );
    }
  }

  /**
   * Submit payout transaction signature
   */
  static async submitPayoutTransaction(req, res) {
    try {
      const userId = req.payload?.id;
      const { signedTransaction, transactionId, raffleId } = req.body;

      if (!signedTransaction || !transactionId || !raffleId) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Missing required data: signedTransaction, transactionId, and raffleId"
        );
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["pubkey"],
      });

      if (!user || !user.pubkey) {
        return respond(res, httpStatus.BAD_REQUEST, "User wallet not found");
      }

      const splTokenTx = await SplTokenSendTransaction.findOne({
        where: {
          id: transactionId,
          receiverPubkey: user.pubkey,
          rewardTransferType: "creator_payout",
          status: SPL_TOKEN_SEND_TX_STATUS.PENDING,
          txId: null, // Should be null initially
        },
      });

      if (!splTokenTx) {
        return respond(
          res,
          httpStatus.NOT_FOUND,
          "Payout transaction not found or already processed"
        );
      }

      // Verify the raffle is still valid for claiming
      const raffle = await Raffle.findOne({
        where: {
          id: raffleId,
          userId: userId,
          creatorClaimTxId: transactionId,
        },
      });

      if (!raffle) {
        return respond(
          res,
          httpStatus.NOT_FOUND,
          "Raffle not found or transaction mismatch"
        );
      }

      const submissionResult = await submitTransactionToBlockchain(
        signedTransaction
      );

      if (!submissionResult.success) {
        logger.error(
          `Payout transaction submission failed:`,
          submissionResult.error
        );
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `Transaction submission failed: ${submissionResult.error}`
        );
      }

      const signature = submissionResult.signature;

      await SplTokenSendTransaction.update(
        {
          txId: signature,
          status: SPL_TOKEN_SEND_TX_STATUS.PENDING, // Mark as PENDING, cron job will verify and set to SUCCESS
        },
        {
          where: { id: transactionId },
        }
      );

      logger.info(
        `Payout transaction signature submitted for transaction ${transactionId}, signature: ${signature}`
      );

      return respond(
        res,
        httpStatus.OK,
        "Payout transaction submitted successfully",
        {
          success: true,
          signature: signature,
          transactionId: transactionId,
          raffleId: raffleId,
          explorerUrl: `https://solscan.io/tx/${signature}`,
          message:
            "Your payout is being processed and will be confirmed shortly.",
        }
      );
    } catch (err) {
      logger.error("Error submitting payout transaction:", err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to submit payout transaction"
      );
    }
  }
}

module.exports = RaffleController;
