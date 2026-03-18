const {
  SplTokenSendTransaction,
  User,
  Raffle,
  RaffleTicket,
  RaffleReward,
  TicketReservation,
  VerifiedToken,
} = require("../models");
const {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAccount,
  TokenAccountNotFoundError,
} = require("@solana/spl-token");

const { getUmi } = require("../config/solana");
const { FUND_RECEIVER_WALLET } = require("../config/credentials");
const { Wallet } = require("../helpers/solana/wallet");
const { status: httpStatus } = require("http-status");
const respond = require("../util/respond");
const logger = require("../util/logger");
const { parseSequelizeErrors } = require("../util/error");
const {
  SPL_TOKEN_SEND_TX_STATUS,
  SPL_TOKEN_ADDRESS,
  SPL_TOKEN_SEND_TRANSACTION_TYPE,
  TOKEN_TYPE,
  mapEnumValue,
  RAFFLE_STATUS,
  COMMISSION_RATES,
} = require("../config/data");

const { addCommissionToTransaction } = require("../services/commissions");
const NFTService = require("../services/nft.service");
const SocketService = require("../services/socket.service");
const TicketReservationService = require("../services/ticket-reservation.service");

const dotenv = require("dotenv");
const { getFeeData } = require("../helpers/cache/system-fee");
const { DEFAULT_COMMISSION } = require("../config/constants");
dotenv.config();

class TicketController {
  static async buyTicket(req, res) {
    try {
      const { senderPubkey, type, raffleId, ticketCount } = req.body;

      if (!senderPubkey || !type || !raffleId || !ticketCount) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Insufficient data provided"
        );
      }

      const existingUser = await User.findOne({
        where: { pubkey: senderPubkey },
      });

      if (!existingUser) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "User Not Found, please Login Again"
        );
      }

      const raffleData = await Raffle.findOne({ where: { id: raffleId } });

      if (!raffleData) {
        return respond(res, httpStatus.BAD_REQUEST, "Raffle not found");
      }

      if (raffleData.status !== RAFFLE_STATUS.LIVE) {
        return respond(res, httpStatus.BAD_REQUEST, "Raffle is not live yet");
      }

      let expectedTokenAddress = null;
      let expectedTokenType = raffleData.tokenType;

      if (expectedTokenType === TOKEN_TYPE.SOLANA) {
        expectedTokenAddress = "solana";
      } else {
        if (raffleData.tokenAddress) {
          expectedTokenAddress = raffleData.tokenAddress;
        } else {
          const raffleToken = await VerifiedToken.findOne({
            where: {
              tokenType: expectedTokenType,
              isVerified: true,
              isPaymentToken: true,
            },
          });

          if (!raffleToken) {
            return respond(
              res,
              httpStatus.BAD_REQUEST,
              "Raffle token configuration is invalid"
            );
          }

          expectedTokenAddress = raffleToken.address;
        }
      }

      console.log("Expected token address:", expectedTokenAddress); // Debug log

      if (type !== expectedTokenAddress) {
        let raffleTokenName = "Unknown";
        if (expectedTokenType === TOKEN_TYPE.SOLANA) {
          raffleTokenName = "SOL";
        } else {
          const tokenRecord = await VerifiedToken.findOne({
            where: { tokenType: expectedTokenType },
          });
          raffleTokenName =
            tokenRecord?.symbol || tokenRecord?.name || "Unknown";
        }

        return respond(
          res,
          httpStatus.BAD_REQUEST,
          `This raffle requires payment in ${raffleTokenName}. Please use the correct token.`
        );
      }

      // CRITICAL: Use reservation system to prevent race conditions
      const reservationResult = await TicketReservationService.reserveTickets({
        raffleId,
        userId: existingUser.id,
        walletAddress: senderPubkey,
        ticketCount,
        reservationTimeoutSeconds: 60, // 60 second reservation window
      });

      if (!reservationResult.success) {
        return respond(res, httpStatus.BAD_REQUEST, reservationResult.message, {
          error: reservationResult.error,
          availableTickets: reservationResult.availableTickets,
        });
      }

      const nftHolderInfo = await NFTService.checkNFTCollectionHolder(
        senderPubkey
      );
      const isNFTHolder = nftHolderInfo.isHolder;
      const feeData = await getFeeData();

      const commissionRate = isNFTHolder
        ? feeData.holder_participant_fee / 100 || COMMISSION_RATES.HOLDER
        : feeData.non_holder_participant_fee / 100 ||
          COMMISSION_RATES.NON_HOLDER;

      const ticketPrice = raffleData.ticketPrice;
      const totalSolAmount = ticketPrice * ticketCount;

      const commissionAmount = totalSolAmount * commissionRate;
      const creatorAmount = totalSolAmount * (1 - commissionRate);

      const senderPublicKey = new PublicKey(senderPubkey);
      // Commission portion goes to FUND_RECEIVER_WALLET, creator portion goes to platform wallet
      const commissionReceiverPublicKey = new PublicKey(FUND_RECEIVER_WALLET);
      const platformPublicKey = Wallet.getWalletPubkey();

      const umi = getUmi();

      let tokenDetails = null;
      let tokenAddress = null;
      let tokenDecimals = 9;
      let tokenProgramId = null;
      let transactionType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA;

      if (type !== "solana") {
        tokenDetails = await VerifiedToken.findOne({
          where: {
            address: type,
            isVerified: true,
            isPaymentToken: true,
          },
        });

        if (!tokenDetails) {
          await TicketReservationService.cancelReservation(
            reservationResult.reservation.reservationId
          );
          return respond(
            res,
            httpStatus.BAD_REQUEST,
            "Invalid or unverified token type"
          );
        }

        tokenAddress = tokenDetails.address;
        tokenDecimals = tokenDetails.decimals;
        tokenProgramId = tokenDetails.programId
          ? new PublicKey(tokenDetails.programId)
          : TOKEN_PROGRAM_ID;

        switch (tokenDetails.tokenType) {
          case TOKEN_TYPE.SPL_TOKEN:
            transactionType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN;
            break;
          case TOKEN_TYPE.SPL_TOKEN_2022:
            transactionType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN_2022;
            break;
          case TOKEN_TYPE.USDC:
            transactionType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN;
            break;
          default:
            await TicketReservationService.cancelReservation(
              reservationResult.reservation.reservationId
            );
            return respond(
              res,
              httpStatus.BAD_REQUEST,
              "Unsupported token type"
            );
        }
      }

      let transaction = new Transaction();

      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 100_000,
        })
      );

      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200_000,
        })
      );

      //transaction fee
      const transactionFee =
        Number(feeData.transaction_fee) || DEFAULT_COMMISSION;
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(senderPubkey),
          toPubkey: new PublicKey(FUND_RECEIVER_WALLET),
          lamports: BigInt(transactionFee * LAMPORTS_PER_SOL),
        })
      );

      switch (type) {
        case "solana":
          // Commission portion → FUND_RECEIVER_WALLET
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: senderPublicKey,
              lamports: Math.round(commissionAmount * LAMPORTS_PER_SOL),
              toPubkey: commissionReceiverPublicKey,
            })
          );
          // Creator portion → platform wallet
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: senderPublicKey,
              lamports: Math.round(creatorAmount * LAMPORTS_PER_SOL),
              toPubkey: platformPublicKey,
            })
          );
          tokenAddress = SPL_TOKEN_ADDRESS.SOLANA;
          break;

        default: {
          // SPL Token transfer — split into commission and creator portions
          const commissionTokenAmount = Math.round(
            commissionAmount * Math.pow(10, tokenDecimals)
          );
          const creatorTokenAmount = Math.round(
            creatorAmount * Math.pow(10, tokenDecimals)
          );
          const mint = new PublicKey(tokenAddress);
          const rpcConnection = getUmi().rpc;

          const senderTokenAccount = getAssociatedTokenAddressSync(
            mint,
            senderPublicKey,
            false,
            tokenProgramId
          );

          // Commission receiver ATA (FUND_RECEIVER_WALLET)
          const commissionReceiverTokenAccount = getAssociatedTokenAddressSync(
            mint,
            commissionReceiverPublicKey,
            false,
            tokenProgramId
          );
          try {
            const accountInfo = await rpcConnection.getAccount(
              commissionReceiverTokenAccount
            );
            if (!accountInfo.exists) {
              transaction.add(
                createAssociatedTokenAccountInstruction(
                  senderPublicKey,
                  commissionReceiverTokenAccount,
                  commissionReceiverPublicKey,
                  mint,
                  tokenProgramId,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              );
            }
          } catch (error) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                senderPublicKey,
                commissionReceiverTokenAccount,
                commissionReceiverPublicKey,
                mint,
                tokenProgramId,
                ASSOCIATED_TOKEN_PROGRAM_ID
              )
            );
          }

          // Platform wallet ATA (creator portion)
          const platformTokenAccount = getAssociatedTokenAddressSync(
            mint,
            platformPublicKey,
            false,
            tokenProgramId
          );
          try {
            const accountInfo = await rpcConnection.getAccount(
              platformTokenAccount
            );
            if (!accountInfo.exists) {
              transaction.add(
                createAssociatedTokenAccountInstruction(
                  senderPublicKey,
                  platformTokenAccount,
                  platformPublicKey,
                  mint,
                  tokenProgramId,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              );
            }
          } catch (error) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                senderPublicKey,
                platformTokenAccount,
                platformPublicKey,
                mint,
                tokenProgramId,
                ASSOCIATED_TOKEN_PROGRAM_ID
              )
            );
          }

          if (commissionTokenAmount > 0) {
            transaction.add(
              createTransferInstruction(
                senderTokenAccount,
                commissionReceiverTokenAccount,
                senderPublicKey,
                BigInt(commissionTokenAmount),
                [],
                tokenProgramId
              )
            );
          }

          if (creatorTokenAmount > 0) {
            transaction.add(
              createTransferInstruction(
                senderTokenAccount,
                platformTokenAccount,
                senderPublicKey,
                BigInt(creatorTokenAmount),
                [],
                tokenProgramId
              )
            );
          }
          break;
        }
      }

      const latestBlockhash = await umi.rpc.getLatestBlockhash();

      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = senderPublicKey;

      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
      });
      const transactionBase64 = serializedTransaction.toString("base64");

      const resData = {
        transaction: transactionBase64,
        blockhash: latestBlockhash,
        totalSolAmount: totalSolAmount,
        lamports:
          type === "solana"
            ? totalSolAmount * LAMPORTS_PER_SOL
            : Math.round(totalSolAmount * Math.pow(10, tokenDecimals)),
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        creatorAmount: creatorAmount,
        isNFTHolder: isNFTHolder,
        raffleId,
        ticketCount,
        // Include reservation details for frontend
        reservationId: reservationResult.reservation.reservationId,
        reservationExpiresAt: reservationResult.reservation.expiresAt,
        reservationTimeoutSeconds: reservationResult.reservation.timeoutSeconds,
        // Token details
        tokenType: type,
        tokenAddress: tokenAddress,
        tokenDecimals: tokenDecimals,
        transactionType: transactionType,
      };

      return respond(res, httpStatus.OK, "Success", resData);
    } catch (error) {
      logger.error(error);
      return respond(res, httpStatus.BAD_REQUEST, parseSequelizeErrors(error));
    }
  }

  static async storeSignature(req, res) {
    try {
      const {
        signature,
        pubkey,
        type,
        entryToken,
        reservationId,
        tokenDecimals = 9,
      } = req.body;

      const lamports = Number(req.body.lamports);
      const ticketCount = Number(req.body.ticketCount);
      const raffleId = req.body.raffleId;
      const commissionRate = parseFloat(req.body.commissionRate);
      const creatorAmount = parseFloat(req.body.creatorAmount);
      const commissionAmount = parseFloat(req.body.commissionAmount);
      const isNFTHolder = req.body.isNFTHolder ?? false;

      // CRITICAL: Validate reservation before processing
      if (!reservationId) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Reservation ID is required"
        );
      }

      // Confirm the reservation with the transaction signature
      const confirmationResult =
        await TicketReservationService.confirmReservation(
          reservationId,
          signature
        );

      if (!confirmationResult.success) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          confirmationResult.message,
          { error: confirmationResult.error }
        );
      }

      const reservation = confirmationResult.reservation;

      // Validate that the reservation matches the request
      if (
        reservation.raffleId !== raffleId ||
        reservation.ticketCount !== ticketCount ||
        reservation.walletAddress !== pubkey
      ) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Reservation details do not match request"
        );
      }

      // Fetch raffle data to get correct token information
      const raffleData = await Raffle.findOne({ where: { id: raffleId } });
      if (!raffleData) {
        return respond(res, httpStatus.NOT_FOUND, "Raffle not found");
      }

      const signatureToStore = signature;

      let senderPubkey, receiverPubkey;

      switch (type) {
        case "load":
          senderPubkey = pubkey;
          receiverPubkey = FUND_RECEIVER_WALLET;
          break;
        default:
          break;
      }

      // Determine correct token information based on raffle's tokenType
      let tokenType, tokenAddress, decimals;

      if (raffleData.tokenType === TOKEN_TYPE.SOLANA) {
        tokenType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA;
        tokenAddress = SPL_TOKEN_ADDRESS.SOLANA;
        decimals = 9;
      } else if (raffleData.tokenType === TOKEN_TYPE.SPL_TOKEN) {
        tokenType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN;
        tokenAddress = raffleData.tokenAddress;

        try {
          const { getTokenDetail } = require("../helpers/solana/token-program");
          const tokenDetail = await getTokenDetail(raffleData.tokenAddress);
          decimals = tokenDetail.decimals || 9;
        } catch (error) {
          logger.warn(
            `Failed to get token details for ${raffleData.tokenAddress}, using fallback decimals`
          );
          decimals = tokenDecimals || 9;
        }
      } else if (raffleData.tokenType === TOKEN_TYPE.SPL_TOKEN_2022) {
        tokenType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN_2022;
        tokenAddress = raffleData.tokenAddress;

        try {
          const { getTokenDetail } = require("../helpers/solana/token-program");
          const tokenDetail = await getTokenDetail(raffleData.tokenAddress);
          decimals = tokenDetail.decimals || 9;
        } catch (error) {
          logger.warn(
            `Failed to get token details for ${raffleData.tokenAddress}, using fallback decimals`
          );
          decimals = tokenDecimals || 9;
        }
      } else if (raffleData.tokenType === TOKEN_TYPE.USDC) {
        tokenType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN;
        tokenAddress = raffleData.tokenAddress || SPL_TOKEN_ADDRESS.USDC;
        decimals = 6;
      } else {
        // Fallback to Solana
        tokenType = SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA;
        tokenAddress = SPL_TOKEN_ADDRESS.SOLANA;
        decimals = 9;
      }

      const splTokenSendTxData = {
        senderPubkey,
        receiverPubkey,
        type: tokenType,
        txId: signatureToStore,
        tokenAddress: tokenAddress,
        decimals: decimals,
        uiAmount: Math.round(Number(lamports)),
        status: SPL_TOKEN_SEND_TX_STATUS.PENDING,
        commissionRate,
        creatorAmount,
        commissionAmount,
        isNFTHolder,
        raffleId: raffleId,
        rewardTransferType: "ticket_purchase", // Mark as ticket purchase for XP processing
      };

      const splTokenSendTxDb = await SplTokenSendTransaction.create(
        splTokenSendTxData
      );

      if (raffleId && ticketCount) {
        try {
          await Raffle.increment("ticketsSold", {
            by: ticketCount,
            where: { id: raffleId },
          });

          await Raffle.increment(
            {
              totalCommission: commissionAmount,
              claimableAmount: creatorAmount,
              totalRevenue: lamports / Math.pow(10, decimals),
              platformRevenue: commissionAmount,
            },
            {
              where: { id: raffleId },
            }
          );

          const user = await User.findOne({ where: { pubkey: pubkey } });

          if (user) {
            const maxTicket = await RaffleTicket.findOne({
              where: { raffleId: raffleId },
              order: [["ticketNumber", "DESC"]],
              attributes: ["ticketNumber"],
            });

            let nextTicketNumber = 1;
            if (maxTicket && maxTicket.ticketNumber) {
              nextTicketNumber = maxTicket.ticketNumber + 1;
            }

            const tickets = [];
            for (let i = 0; i < ticketCount; i++) {
              tickets.push({
                raffleId: raffleId,
                userId: user.id,
                splTokenSendTxId: splTokenSendTxDb.id,
                ticketNumber: nextTicketNumber + i,
                transactionSignature: signatureToStore,
                isWinner: false,
                commissionRate,
                creatorAmount,
              });
            }

            if (tickets.length > 0) {
              await RaffleTicket.bulkCreate(tickets);
            }

            const updatedRaffle = await Raffle.findOne({
              where: { id: raffleId },
            });

            const responseData = {
              message: "Tickets purchased successfully!",
              signature: signatureToStore,
              ticketCount: ticketCount,
              ticketsCreated: tickets.length,
              ticketNumbers: tickets.map((t) => t.ticketNumber),
              reservationId: reservationId,
              raffle: {
                id: updatedRaffle.id,
                ticketsSold: updatedRaffle.ticketsSold,
                ticketsLeft:
                  updatedRaffle.totalTickets - updatedRaffle.ticketsSold,
                totalCommission: updatedRaffle.totalCommission || 0,
                claimableAmount: updatedRaffle.claimableAmount || 0,
              },
              commissionInfo: {
                rate: commissionRate,
                amount: commissionAmount,
                creatorAmount: creatorAmount,
                isNFTHolder: isNFTHolder,
              },
            };

            // Emit Socket.IO events for real-time updates
            SocketService.emitTicketPurchase(raffleId, {
              ticketCount: ticketCount,
              ticketsSold: updatedRaffle.ticketsSold,
              ticketsLeft:
                updatedRaffle.totalTickets - updatedRaffle.ticketsSold,
              totalTickets: updatedRaffle.totalTickets,
              buyerPubkey: pubkey,
              ticketNumbers: tickets.map((t) => t.ticketNumber),
              signature: signatureToStore,
            });

            // Emit raffle update for live data
            SocketService.emitRaffleUpdate(raffleId, {
              ticketsSold: updatedRaffle.ticketsSold,
              ticketsLeft:
                updatedRaffle.totalTickets - updatedRaffle.ticketsSold,
              totalRevenue: updatedRaffle.totalRevenue,
              progressPercentage: (
                (updatedRaffle.ticketsSold / updatedRaffle.totalTickets) *
                100
              ).toFixed(2),
            });

            // Emit global raffle list update for home page
            SocketService.emitGlobalUpdate("raffle-list-updated", {
              raffleId: raffleId,
              ticketsSold: updatedRaffle.ticketsSold,
              totalTickets: updatedRaffle.totalTickets,
              ticketsLeft:
                updatedRaffle.totalTickets - updatedRaffle.ticketsSold,
              progressPercentage: (
                (updatedRaffle.ticketsSold / updatedRaffle.totalTickets) *
                100
              ).toFixed(2),
              updateType: "ticket_purchase",
            });

            // Check if raffle is sold out and emit event
            if (updatedRaffle.ticketsSold >= updatedRaffle.totalTickets) {
              SocketService.emitRaffleStatusChange(raffleId, "LIVE", "ENDED", {
                reason: "sold_out",
                finalTicketsSold: updatedRaffle.ticketsSold,
                totalTickets: updatedRaffle.totalTickets,
              });
            }

            return respond(
              res,
              httpStatus.OK,
              "Tickets purchased successfully!",
              responseData
            );
          }
        } catch (ticketError) {
          logger.error("Error creating tickets:", ticketError);
          return respond(
            res,
            httpStatus.OK,
            "Transaction stored but ticket creation failed",
            {
              message: "Transaction stored successfully",
              signature: signatureToStore,
              error: "Ticket creation failed",
            }
          );
        }
      }

      const resData = {
        message: "Transaction stored successfully",
        signature: signatureToStore,
        commissionRate: commissionRate,
        isNFTHolder: isNFTHolder,
      };
      return respond(res, httpStatus.OK, "Success", resData);
    } catch (error) {
      logger.error(error);
      return respond(res, httpStatus.BAD_REQUEST, parseSequelizeErrors(error));
    }
  }

  static async getUserTickets(req, res) {
    try {
      const userId = req.payload.id;

      const tickets = await RaffleTicket.findAll({
        where: { userId },
        include: [
          {
            model: Raffle,
            include: [
              {
                model: RaffleReward,
                required: false,
              },
            ],
          },
        ],
        order: [
          // [{ model: Raffle }, "endDate", "DESC"],
          [{ model: Raffle }, "createdAt", "DESC"],
          ["ticketNumber", "ASC"],
        ],
      });

      const groupedTickets = {};

      tickets.forEach((ticket) => {
        const raffleId = ticket.raffleId;

        if (!groupedTickets[raffleId]) {
          groupedTickets[raffleId] = {
            raffle: ticket.raffle,
            tickets: [],
            totalTickets: 0,
            totalSpent: 0,
            status: "UPCOMING",
            ticketNumbers: [],
          };
        }

        groupedTickets[raffleId].tickets.push(ticket);
        groupedTickets[raffleId].totalTickets++;
        groupedTickets[raffleId].totalSpent += parseFloat(
          ticket.raffle.ticketPrice
        );
        groupedTickets[raffleId].ticketNumbers.push(ticket.ticketNumber);

        if (ticket.isWinner) {
          groupedTickets[raffleId].hasWinningTicket = true;
        }
      });

      const raffleGroups = Object.values(groupedTickets).map((group) => {
        const raffle = group.raffle;

        const tokenType = mapEnumValue(TOKEN_TYPE, raffle.tokenType);

        return {
          raffleId: raffle.id,
          title: raffle.title,
          description: raffle.description || "",
          imageUrl: raffle.imageUrl,
          status: mapEnumValue(RAFFLE_STATUS, raffle.status),
          ticketCount: group.totalTickets,
          totalSpent: group.totalSpent,
          tokenType: tokenType,
          tokenAddress: raffle.tokenAddress, // for proper symbol mapping
          endDate: raffle.endDate,
          ticketsSold: raffle.ticketsSold,
          totalTickets: raffle.totalTickets,
          ticketNumbers: group.ticketNumbers.sort((a, b) => a - b),
          isWinner: group.hasWinningTicket || false,
        };
      });

      raffleGroups.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

      const formattedResponse = raffleGroups.map((group) => ({
        id: group.raffleId,
        title: group.title,
        description: group.description,
        image: group.imageUrl,
        prizeValue: group.prizeValue,
        status: group.status,
        tickets: group.ticketCount,
        spent: group.totalSpent,
        tokenType: group.tokenType,
        tokenAddress: group.tokenAddress,
        endsAt: group.endDate,
        ticketNumbers: group.ticketNumbers,
        progress: {
          sold: group.ticketsSold,
          total: group.totalTickets,
          percentage: Math.round(
            (group.ticketsSold / group.totalTickets) * 100
          ),
        },
      }));

      return respond(res, httpStatus.OK, "User Tickets Fetched Successfully", {
        tickets: formattedResponse,
      });
    } catch (error) {
      logger.error("Error fetching user tickets:", error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to fetch user tickets",
        { error: error.message }
      );
    }
  }

  /**
   * Cancel an active ticket reservation
   */
  static async cancelReservation(req, res) {
    try {
      const { reservationId } = req.body;

      if (!reservationId) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Reservation ID is required"
        );
      }

      const result = await TicketReservationService.cancelReservation(
        reservationId
      );

      if (!result.success) {
        return respond(res, httpStatus.BAD_REQUEST, result.message, {
          error: result.error,
        });
      }

      return respond(res, httpStatus.OK, "Reservation cancelled successfully");
    } catch (error) {
      logger.error("Error cancelling reservation:", error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to cancel reservation"
      );
    }
  }

  /**
   * Get reservation status
   */
  static async getReservationStatus(req, res) {
    try {
      const { reservationId } = req.params;

      if (!reservationId) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Reservation ID is required"
        );
      }

      const result = await TicketReservationService.getReservationStatus(
        reservationId
      );

      if (!result.success) {
        return respond(res, httpStatus.NOT_FOUND, result.message, {
          error: result.error,
        });
      }

      return respond(
        res,
        httpStatus.OK,
        "Reservation status retrieved successfully",
        result.reservation
      );
    } catch (error) {
      logger.error("Error getting reservation status:", error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to get reservation status"
      );
    }
  }

  /**
   * Get available tickets for a raffle (considering active reservations)
   */
  static async getAvailableTickets(req, res) {
    try {
      const { raffleId } = req.params;

      if (!raffleId) {
        return respond(res, httpStatus.BAD_REQUEST, "Raffle ID is required");
      }

      const availableTickets =
        await TicketReservationService.getAvailableTickets(parseInt(raffleId));

      return respond(
        res,
        httpStatus.OK,
        "Available tickets retrieved successfully",
        { availableTickets }
      );
    } catch (error) {
      logger.error("Error getting available tickets:", error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to get available tickets"
      );
    }
  }
}

module.exports = TicketController;
