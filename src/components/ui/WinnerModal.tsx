import { useState, useEffect } from "react";
import Button from "./Button";
import type { RaffleReward, RaffleType } from "../../views/raffle/RaffleDetail";
import Confetti from "react-confetti";
import { RAFFLE_REWARD_TYPES } from "../../views/raffle/RaffleDetail";

interface WinnerModalProps {
  raffle: RaffleType;
  publicKey: string;
  onClose: () => void;
}

const WinnerModal = ({ raffle, publicKey, onClose }: WinnerModalProps) => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Track window size for confetti
  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter rewards the user won
  const userRewards: RaffleReward[] = (() => {
    if (!raffle.rewards || !raffle.winnersAddresses) return [];

    const winnerIndex = raffle.winnersAddresses.findIndex(
      (addr) => addr === publicKey
    );

    if (winnerIndex === -1) return [];

    return raffle.rewards[winnerIndex] ? [raffle.rewards[winnerIndex]] : [];
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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

        {/* Reward list */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {userRewards.map((reward: RaffleReward) => (
            <div
              key={reward.id}
              className="flex items-center gap-4 p-4 border rounded-lg bg-card"
            >
              {reward.rewardType === RAFFLE_REWARD_TYPES.NFT ? (
                <img
                  src={reward.imageUrl}
                  alt={reward.rewardName}
                  className="w-16 h-16 rounded-md object-cover"
                />
              ) : (
                <img
                  src="/token-icon.png" // fallback image for token rewards
                  alt={reward.rewardName}
                  className="w-16 h-16 rounded-md object-cover"
                />
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold truncate">{reward.rewardName}</p>
                {reward.rewardType !== RAFFLE_REWARD_TYPES.NFT && (
                  <p className="text-sm text-muted-foreground">
                    Amount: {parseFloat(reward.amount)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Mint: {reward.mintAddress.slice(0, 4)}…
                  {reward.mintAddress.slice(-4)}
                </p>
                <a
                  href={`https://solscan.io/token/${reward.mintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View on Solscan
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Close button */}
        <Button className="mt-6 w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default WinnerModal;
