import { apiRequest } from "../../config/api";
import type { ResponseDataType } from "../../config/type";

export const buyTicket = async (
  senderPubkey: string,
  tokenType: string,
  raffleId: number,
  ticketCount: number,
): Promise<ResponseDataType> => {
  return apiRequest({
    method: "post",
    url: "ticket/buy",
    data: {
      type: tokenType,
      senderPubkey,
      raffleId,
      ticketCount,
    },
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
  reservationId: string,
  tokenDecimals: number = 9,
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
      reservationId,
      tokenDecimals,
    },
  });
};

export const cancelReservation = async (
  reservationId: string,
): Promise<ResponseDataType> => {
  return apiRequest({
    method: "post",
    url: "ticket/cancel-reservation",
    data: { reservationId },
  });
};

export const getReservationStatus = async (
  reservationId: string,
): Promise<ResponseDataType> => {
  return apiRequest({
    method: "get",
    url: `ticket/reservation-status/${reservationId}`,
  });
};

export const getAvailableTickets = async (
  raffleId: number,
): Promise<ResponseDataType> => {
  return apiRequest({
    method: "get",
    url: `ticket/available-tickets/${raffleId}`,
  });
};

export const getVerifiedPaymentTokens = async (): Promise<ResponseDataType> => {
  return apiRequest({
    method: "get",
    url: "tokens/payment-tokens",
  });
};

export const getAllVerifiedTokens = async (): Promise<ResponseDataType> => {
  return apiRequest({
    method: "get",
    url: "tokens/all-verified",
  });
};
