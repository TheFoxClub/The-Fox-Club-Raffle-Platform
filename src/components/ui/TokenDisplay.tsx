import { useTokenSymbol } from "../../hooks/useTokenDisplay";

interface TokenDisplayProps {
  amount: number | string;
  tokenType: string;
  tokenAddress?: string;
  className?: string;
}

export const TokenDisplay = ({ amount, tokenType, tokenAddress, className = "" }: TokenDisplayProps) => {
  const { symbol, loading } = useTokenSymbol(tokenType, tokenAddress);

  return (
    <span className={className}>
      {amount} {loading ? "..." : symbol}
    </span>
  );
};