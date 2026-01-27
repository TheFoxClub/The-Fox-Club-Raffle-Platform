import { apiRequest } from "../../config/api";
import type { ResponseDataType } from "../../config/type";

export const buyTicket = async (
  senderPubkey: string,
  tokenAddress: string,
  gameEntryAmount: number
): Promise<ResponseDataType> => {
  return apiRequest({
    method: "post",
    url: "ticket/buy",
    data: { type: "solana", senderPubkey, tokenAddress, gameEntryAmount },
  });
};

export const storeSignature = async (
  pubkey: string,
  signature: string,
  type: "load" | "withdraw",
  lamports: any,
  commissionRate: number,
  commissionAmount: number,
  creatorAmount: number,
  isNFTHolder: boolean,
  entryToken: string | "",
  ticketCount: number,
  raffleId: number,
  reservationId: string // NEW: Required reservation ID
): Promise<ResponseDataType> => {
  return apiRequest({
    method: "post",
    url: "ticket/store-signature",
    data: {
      pubkey,
      signature,
      type,
      lamports,
      commissionRate,
      commissionAmount,
      creatorAmount,
      isNFTHolder,
      entryToken,
      ticketCount,
      raffleId,
      reservationId, // NEW: Include reservation ID
    },
  });
};

export const cancelReservation = async (
  reservationId: string
): Promise<ResponseDataType> => {
  return apiRequest({
    method: "post",
    url: "ticket/cancel-reservation",
    data: { reservationId },
  });
};

export const getReservationStatus = async (
  reservationId: string
): Promise<ResponseDataType> => {
  return apiRequest({
    method: "get",
    url: `ticket/reservation-status/${reservationId}`,
  });
};

export const getAvailableTickets = async (
  raffleId: number
): Promise<ResponseDataType> => {
  return apiRequest({
    method: "get",
    url: `ticket/available-tickets/${raffleId}`,
  });
};
