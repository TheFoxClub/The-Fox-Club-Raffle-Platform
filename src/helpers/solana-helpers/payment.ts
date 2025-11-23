import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { ReceiverType } from "../wallet-hooks/useMyWallet";

const makeSolPaymentToMultipleReceivers = async (
  wallet: WalletContextState,
  connection: Connection,
  totalAmount: number,
  receivers: Array<ReceiverType>,
): Promise<{
  message: string;
  success: boolean;
  data?: any;
}> => {
  const totalPercentage: number = receivers.map((a) => a.percentage).reduce((a, b) => a + b, 0);

  if (totalPercentage !== 100) {
    return {
      message: "Payment received by the receivers should sum to 100%.",
      success: false,
    };
  }

  let txInstructions: TransactionInstruction[] = receivers.map((receiver) => {
    return SystemProgram.transfer({
      fromPubkey: new PublicKey(wallet.publicKey),
      toPubkey: new PublicKey(receiver.pubkey),
      lamports: Number((LAMPORTS_PER_SOL * (totalAmount * receiver.percentage)) / 100),
    });
  });

  const numTransactions = Math.ceil(txInstructions.length);

  let transaction = new Transaction();

  for (let i = 0; i < numTransactions; i++) {
    transaction.add(txInstructions[i]);
  }

  const latestBlockhash = await connection.getLatestBlockhash();
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = latestBlockhash.blockhash;

  const signed = await wallet.signTransaction(transaction);

  const signature = await connection.sendRawTransaction(signed.serialize());
  return {
    success: true,
    message: "Payment made successfully!",
    data: { signature },
  };
};

export { makeSolPaymentToMultipleReceivers };
