import { useTokenSymbol } from "../../hooks/useTokenDisplay";

interface RaffleTokenBadgeProps {
  tokenType: number;
  tokenAddress?: string;
}

const mapNumericTokenType = (numericTokenType: number): string => {
  switch (numericTokenType) {
    case 0:
      return "SOLANA";
    case 1:
      return "SPL_TOKEN";
    case 2:
      return "SPL_TOKEN_2022";
    case 3:
      return "USDC";
    default:
      return "SOLANA";
  }
};

export const RaffleTokenBadge = ({ tokenType, tokenAddress }: RaffleTokenBadgeProps) => {
  const mappedTokenType = mapNumericTokenType(tokenType);
  const { symbol: enhancedTokenSymbol, loading: tokenLoading } = useTokenSymbol(
    mappedTokenType,
    tokenAddress
  );

  return (
    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
      {tokenLoading ? "..." : enhancedTokenSymbol}
    </span>
  );
};