export const getTokenSymbol = (
  tokenType: string,
  tokenAddress?: string,
): string => {
  switch (tokenType) {
    case "SOLANA":
      return "SOL";
    case "USDC":
      return "USDC";
    case "SPL_TOKEN":
    case "SPL_TOKEN_2022":
      // return a truncated address or generic symbol
      if (tokenAddress) {
        return `${tokenAddress.substring(0, 4)}...${tokenAddress.substring(tokenAddress.length - 4)}`;
      }
      return "SPL";
    default:
      return "SOL"; // Fallback
  }
};

// Returns full token names instead of symbols
export const getTokenName = (
  tokenType: string,
  tokenAddress?: string,
): string => {
  switch (tokenType) {
    case "SOLANA":
      return "Solana";
    case "USDC":
      return "USD Coin";
    case "SPL_TOKEN":
      return "SPL Token";
    case "SPL_TOKEN_2022":
      return "SPL Token 2022";
    default:
      return "Solana";
  }
};

export const isSolanaToken = (tokenType: string): boolean => {
  return tokenType === "SOLANA";
};

export const isSplToken = (tokenType: string): boolean => {
  return tokenType === "SPL_TOKEN" || tokenType === "SPL_TOKEN_2022";
};
