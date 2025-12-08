const {
  SplTokenSendTransaction,
  User,
  Raffle,
  RaffleTicket,
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
} = require("../config/data");

const { addCommissionToTransaction } = require("../services/commissions");

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

      const ticketPrice = raffleData.ticketPrice;
      const totalSolAmount = ticketPrice * ticketCount;

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
          return res.json({
            message: "Invalid reward type",
          });
      }

      transaction = await addCommissionToTransaction({
        transaction: transaction,
        senderPubkey: senderPubkey,
      });

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
        uiAmount: lamports,
        status: SPL_TOKEN_SEND_TX_STATUS.PENDING,
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
              },
            };

            return respond(
              res,
              httpStatus.OK,
              "Tickets purchased successfully!",
              responseData
            );
          }
        } catch (ticketError) {
          logger.error("Error creating tickets:", ticketError);
        }
      }

      const resData = {
        message: "Transaction stored successfully",
        signature: signatureToStore,
      };
      return respond(res, httpStatus.OK, "Success", resData);
    } catch (error) {
      logger.error(error);
      return respond(res, httpStatus.BAD_REQUEST, parseSequelizeErrors(error));
    }
  }
}

module.exports = TicketController;
