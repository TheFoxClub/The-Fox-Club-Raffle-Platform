import { useTokenSymbol } from "../../hooks/useTokenDisplay";

interface RaffleRevenueDisplayProps {
  revenue: number;
  tokenType: number;
  tokenAddress?: string;
  className?: string;
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

export const RaffleRevenueDisplay = ({ 
  revenue, 
  tokenType, 
  tokenAddress, 
  className = "font-semibold text-primary" 
}: RaffleRevenueDisplayProps) => {
  const mappedTokenType = mapNumericTokenType(tokenType);
  const { symbol: enhancedTokenSymbol, loading: tokenLoading } = useTokenSymbol(
    mappedTokenType,
    tokenAddress
  );

  return (
    <span className={className}>
      {revenue} {tokenLoading ? "..." : enhancedTokenSymbol}
    </span>
  );
};