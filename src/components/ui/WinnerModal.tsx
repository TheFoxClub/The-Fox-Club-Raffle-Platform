import { useState, useEffect } from "react";
import Button from "./Button";
import type { RaffleType } from "../../views/raffle/RaffleDetail";
import Confetti from "react-confetti";
//import { RAFFLE_REWARD_TYPES } from "../../views/raffle/RaffleDetail";
import { useNavigate } from "react-router-dom";

interface WinnerModalProps {
  raffle: RaffleType;
  publicKey: string;
  onClose: () => void;
}

const WinnerModal = ({ raffle, publicKey, onClose }: WinnerModalProps) => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const navigate = useNavigate();
  // Track window size for confetti
  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter rewards the user won
  const userRewards =
    raffle.winnersData?.filter((winner) => winner.winnerPubkey === publicKey) ??
    [];

  const allClaimed = userRewards.every((reward) => reward.isClaimed);

  const handleClaimClick = () => {
    // Redirect to profile page to claim rewards
    navigate("/profile#wins");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/86">
      {/* Confetti */}
      {userRewards.length > 0 && (
        <Confetti width={windowSize.width} height={windowSize.height} />
      )}

      <div className="bg-card/40 p-8 rounded-xl border border-border w-full max-w-md text-center relative animate-slide-in">
        <h2 className="text-2xl font-bold mb-4 text-green-600">
          🎉 Congratulations! 🎉
        </h2>
        <p className="mb-4 font-semibold">
          You’re a winner! Here’s what you’ve won:
        </p>

        {userRewards.map((winner) => (
          <div
            key={winner.rewardId}
            className="flex items-center gap-4 p-4 border rounded-lg bg-card"
          >
            <img
              src={winner.imageUrl}
              alt={winner.rewardName}
              className="w-16 h-16 rounded-md object-cover"
            />
            <div className="text-left">
              <p className="font-semibold">{winner.rewardName}</p>
              <p className="text-sm text-muted-foreground">
                Amount: {parseFloat(winner.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                Mint: {winner.mintAddress.slice(0, 4)}…
                {winner.mintAddress.slice(-4)}
              </p>
              {winner.isClaimed && (
                <span className="text-xs text-green-500 font-semibold">
                  ✓ Already Claimed
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-6">
          {!allClaimed && (
            <Button className="w-full" onClick={handleClaimClick}>
              View Profile to Claim
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WinnerModal;
