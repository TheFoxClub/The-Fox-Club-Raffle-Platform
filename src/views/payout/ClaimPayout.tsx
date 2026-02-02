import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import Button from "../../components/ui/Button";
import server from "../../config/server";
import { toast } from "react-toastify";
import { getTokenSymbol } from "../../utils/tokenUtils";

interface ClaimPayoutProps {
  raffleId: number;
  payoutAmount: number;
  tokenType: string;
  tokenAddress?: string;
  onClaimed: () => void;
  disabled?: boolean;
}

const ClaimPayout = ({ raffleId, payoutAmount, tokenType, tokenAddress, onClaimed, disabled }: ClaimPayoutProps) => {
  const { publicKey, signTransaction } = useWallet();
  const [claiming, setClaiming] = useState(false);

  const handleClaimPayout = async () => {
    if (!publicKey || !signTransaction) {
      toast.error("Please connect your wallet first");
      return;
    }

    setClaiming(true);
    try {
      // Create payout transaction
      const response = await server.post("/raffle/payout/claim", { raffleId });
      
      if (!response.data.success) {
        toast.error(response.data.message || "Failed to create payout transaction");
        return;
      }

      if (!response.data.data.requiresSubmission) {
        toast.error("Invalid payout response");
        return;
      }

      const { transaction, transactionId } = response.data.data;
      
      // Sign the transaction
      const transactionBuffer = Buffer.from(transaction, "base64");
      const deserializedTransaction = Transaction.from(transactionBuffer);
      
      // Sign the transaction (user pays fees)
      const signedTransaction = await signTransaction(deserializedTransaction);
      
      // Submit the signed transaction to backend
      const submitResponse = await server.post("/raffle/payout/submit", {
        signedTransaction: Buffer.from(signedTransaction.serialize()).toString("base64"),
        transactionId,
        raffleId,
      });
      
      if (submitResponse.data.success) {
        toast.success(
          `Payout transaction submitted! Your ${payoutAmount.toFixed(4)} ${getTokenSymbol(tokenType, tokenAddress)} will be processed shortly.`
        );

        onClaimed();
      } else {
        toast.error(submitResponse.data.message || "Failed to submit payout transaction");
      }
      
    } catch (error: any) {
      console.error("Error claiming payout:", error);
      
      if (error.message?.includes("User rejected")) {
        toast.error("Transaction was cancelled");
      } else if (error.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds for transaction fees");
      } else if (error.message?.includes("blockhash")) {
        toast.error("Transaction expired. Please try again.");
      } else {
        toast.error(
          error.response?.data?.message || 
          error.message || 
          "Failed to claim payout. Please try again."
        );
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Button
      onClick={handleClaimPayout}
      disabled={claiming || disabled || !publicKey}
      className="bg-primary hover:bg-primary/90"
    >
      {claiming ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Claiming...
        </div>
      ) : (
        "Claim Payout"
      )}
    </Button>
  );
};

export default ClaimPayout;