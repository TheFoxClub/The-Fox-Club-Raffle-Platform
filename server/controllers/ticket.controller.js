const {
  SplTokenSendTransaction,
  User,
  Raffle,
  RaffleTicket,
  RaffleReward,
} = require("../models");
const {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");

const { getUmi } = require("../config/solana");
const { BET_RECEIVER_WALLET } = require("../config/credentials");
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

const dotenv = require("dotenv");
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

      const nftHolderInfo = await NFTService.checkNFTCollectionHolder(
        senderPubkey
      );
      const isNFTHolder = nftHolderInfo.isHolder;

      const commissionRate = isNFTHolder
        ? COMMISSION_RATES.HOLDER
        : COMMISSION_RATES.NON_HOLDER;

      const ticketPrice = raffleData.ticketPrice;
      const totalSolAmount = ticketPrice * ticketCount;

      const commissionAmount = totalSolAmount * commissionRate;
      const creatorAmount = totalSolAmount * (1 - commissionRate);

      const senderPublicKey = new PublicKey(senderPubkey);
      const receiverPubkey = BET_RECEIVER_WALLET;
      const receiverPublicKey = new PublicKey(receiverPubkey);

      const umi = getUmi();

      let transaction = new Transaction();

      switch (type) {
        case "solana":
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: senderPublicKey,
              lamports: Math.round(totalSolAmount * LAMPORTS_PER_SOL),
              toPubkey: receiverPublicKey,
            })
          );
          break;
        default:
          return respond(res, httpStatus.BAD_REQUEST, "Invalid reward type");
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
        lamports: totalSolAmount * LAMPORTS_PER_SOL,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        creatorAmount: creatorAmount,
        isNFTHolder: isNFTHolder,
        raffleId,
        ticketCount,
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
        lamports,
        entryToken,
        ticketCount,
        raffleId,
        commissionRate,
        creatorAmount,
        commissionAmount,
        isNFTHolder = false,
      } = req.body;

      const signatureToStore = signature;

      let senderPubkey, receiverPubkey;

      switch (type) {
        case "load":
          senderPubkey = pubkey;
          receiverPubkey = BET_RECEIVER_WALLET;
          break;
        default:
          break;
      }

      const splTokenSendTxData = {
        senderPubkey,
        receiverPubkey,
        type:
          entryToken === "sol"
            ? SPL_TOKEN_SEND_TRANSACTION_TYPE.SOLANA
            : SPL_TOKEN_SEND_TRANSACTION_TYPE.SPL_TOKEN,
        txId: signatureToStore,
        tokenAddress: entryToken === "sol" ? SPL_TOKEN_ADDRESS.SOLANA : "",
        decimals: 9,
        uiAmount: Math.round(Number(lamports)),
        status: SPL_TOKEN_SEND_TX_STATUS.PENDING,
        commissionRate,
        creatorAmount,
        commissionAmount,
        isNFTHolder,
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
              totalRevenue: lamports / LAMPORTS_PER_SOL,
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
              ticketsLeft: updatedRaffle.totalTickets - updatedRaffle.ticketsSold,
              totalTickets: updatedRaffle.totalTickets,
              buyerPubkey: pubkey,
              ticketNumbers: tickets.map((t) => t.ticketNumber),
              signature: signatureToStore,
            });

            // Emit raffle update for live data
            SocketService.emitRaffleUpdate(raffleId, {
              ticketsSold: updatedRaffle.ticketsSold,
              ticketsLeft: updatedRaffle.totalTickets - updatedRaffle.ticketsSold,
              totalRevenue: updatedRaffle.totalRevenue,
              progressPercentage: ((updatedRaffle.ticketsSold / updatedRaffle.totalTickets) * 100).toFixed(2),
            });

            // Emit global raffle list update for home page
            SocketService.emitGlobalUpdate("raffle-list-updated", {
              raffleId: raffleId,
              ticketsSold: updatedRaffle.ticketsSold,
              totalTickets: updatedRaffle.totalTickets,
              ticketsLeft: updatedRaffle.totalTickets - updatedRaffle.ticketsSold,
              progressPercentage: ((updatedRaffle.ticketsSold / updatedRaffle.totalTickets) * 100).toFixed(2),
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
          [{ model: Raffle }, "endDate", "DESC"],
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
          totalSpent: group.totalSpent.toFixed(2),
          tokenType: tokenType,
          endDate: raffle.endDate,
          ticketsSold: raffle.ticketsSold,
          totalTickets: raffle.totalTickets,
          ticketNumbers: group.ticketNumbers.sort((a, b) => a - b),
          isWinner: group.hasWinningTicket || false,
        };
      });

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
}

module.exports = TicketController;
