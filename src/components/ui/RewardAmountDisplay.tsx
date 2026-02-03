import { useTokenSymbol } from "../../hooks/useTokenDisplay";

interface RewardAmountDisplayProps {
  amount: string | number;
  rewardType: number;
  mintAddress: string;
  className?: string;
}

// Reward types mapping (from RaffleDetail.tsx)
const RAFFLE_REWARD_TYPES = {
  NFT: 0,
  SPL_TOKEN: 1,
  SPL_TOKEN_2022: 2,
};

export const RewardAmountDisplay = ({ 
  amount, 
  rewardType, 
  mintAddress, 
  className = "" 
}: RewardAmountDisplayProps) => {
  const isTokenReward = rewardType === RAFFLE_REWARD_TYPES.SPL_TOKEN || 
                       rewardType === RAFFLE_REWARD_TYPES.SPL_TOKEN_2022;
  
  const tokenType = rewardType === RAFFLE_REWARD_TYPES.SPL_TOKEN ? "SPL_TOKEN" : "SPL_TOKEN_2022";
  const { symbol, loading } = useTokenSymbol(tokenType, isTokenReward ? mintAddress : undefined);

  if (!isTokenReward) {
    return <span className={className}>Amount: {parseFloat(amount.toString())}</span>;
  }

  return (
    <span className={className}>
      Amount: {parseFloat(amount.toString())} {loading ? "..." : symbol}
    </span>
  );
};