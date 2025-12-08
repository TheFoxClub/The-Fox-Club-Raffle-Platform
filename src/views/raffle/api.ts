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
  entryToken: string | "",
  ticketCount: number,
  raffleId: number
): Promise<ResponseDataType> => {
  return apiRequest({
    method: "post",
    url: "ticket/store-signature",
    data: {
      pubkey,
      signature,
      type,
      lamports,
      entryToken,
      ticketCount,
      raffleId,
    },
  });
};
