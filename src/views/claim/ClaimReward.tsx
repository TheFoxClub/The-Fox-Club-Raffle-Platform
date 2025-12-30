import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { toast } from "react-toastify";
import server from "../../config/server";
import Button from "../../components/ui/Button";
import { CheckCircle, Gift } from "lucide-react";

interface Reward {
  id: string | number;
  isClaimed: boolean;
  rewardName?: string;
  mintAddress?: string;
  amount?: number;
}

interface ClaimRewardProps {
  raffleId: string | number;
  reward: Reward;
  onClaimed?: () => void;
}

interface ClaimResponse {
  success: boolean;
  data: {
    transaction: string;
    checksum: string;
    blockhash: string;
    rewardInfo: {
      id: string | number;
      name: string;
      type: string;
      amount: number;
    };
  };
}

interface SubmitClaimResponse {
  success: boolean;
  data: {
    success: boolean;
    signature: string;
    rewardId: string | number;
    claimedAt: string;
  };
}

const ClaimReward: React.FC<ClaimRewardProps> = ({
  raffleId,
  reward,
  onClaimed,
}) => {
  const { publicKey, signTransaction } = useWallet();
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimed, setClaimed] = useState<boolean>(reward.isClaimed);

  const handleClaim = async (): Promise<void> => {
    if (!publicKey || !signTransaction) {
      toast.error("Please connect your wallet");
      return;
    }

    if (claimed) {
      toast.info("Reward already claimed");
      return;
    }

    try {
      setClaiming(true);

      // Get the claim transaction (platform pre-signed, user pays fees)
      const claimRes = await server.post<ClaimResponse>(
        "/raffle/claim-reward",
        {
          raffleId,
          rewardId: reward.id,
        }
      );

      if (claimRes.data.success && claimRes.data.data) {
        const { transaction, checksum } = claimRes.data.data;

        // Sign the transaction (user signature for fee payment)
        const tx = Transaction.from(Buffer.from(transaction, "base64"));
        const signedTx = await signTransaction(tx);

        // Submit signed transaction
        const submitRes = await server.post<SubmitClaimResponse>(
          "/raffle/submit-claim",
          {
            signedTransaction: Buffer.from(signedTx.serialize()).toString(
              "base64"
            ),
            checksum,
            raffleId,
            rewardId: reward.id,
          }
        );

        if (submitRes.data.success && submitRes.data.data) {
          toast.success("Reward claimed successfully!");
          setClaimed(true);

          // Call the onClaimed callback if provided
          if (onClaimed) {
            onClaimed();
          }

          const signature = submitRes.data.data.signature;
          const explorerUrl = `https://solscan.io/tx/${signature}`;

          toast.info(
            <div>
              Transaction confirmed:
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline ml-1"
              >
                View on Solscan
              </a>
            </div>
          );
        } else {
          throw new Error("Failed to submit claim");
        }
      } else {
        throw new Error("Failed to get claim transaction");
      }
    } catch (error: any) {
      console.error("Claim failed:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to claim reward";
      toast.error(errorMessage);
    } finally {
      setClaiming(false);
    }
  };

  if (claimed) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span>Claimed</span>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClaim}
      disabled={claiming || !publicKey || !signTransaction}
      className="gradient-primary gap-2"
      type="button"
    >
      {claiming ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Claiming...
        </>
      ) : (
        <>
          <Gift className="h-4 w-4" />
          Claim Reward
        </>
      )}
    </Button>
  );
};

export default ClaimReward;
