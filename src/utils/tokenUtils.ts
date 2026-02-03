import { tokenService } from "../services/tokenService";

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

// Enhanced version that uses verified token data
export const getTokenSymbolEnhanced = async (
  tokenType: string,
  tokenAddress?: string,
): Promise<string> => {
  switch (tokenType) {
    case "SOLANA":
      return "SOL";
    case "USDC":
      return "USDC";
    case "SPL_TOKEN":
    case "SPL_TOKEN_2022":
      if (tokenAddress) {
        const verifiedSymbol = await tokenService.getTokenSymbol(tokenAddress);
        if (verifiedSymbol) {
          return verifiedSymbol;
        }
        // Fallback to truncated address
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

// Enhanced version that uses verified token data
export const getTokenNameEnhanced = async (
  tokenType: string,
  tokenAddress?: string,
): Promise<string> => {
  switch (tokenType) {
    case "SOLANA":
      return "Solana";
    case "USDC":
      return "USD Coin";
    case "SPL_TOKEN":
    case "SPL_TOKEN_2022":
      if (tokenAddress) {
        const verifiedName = await tokenService.getTokenName(tokenAddress);
        if (verifiedName) {
          return verifiedName;
        }
        // Fallback to generic names
        return tokenType === "SPL_TOKEN" ? "SPL Token" : "SPL Token 2022";
      }
      return tokenType === "SPL_TOKEN" ? "SPL Token" : "SPL Token 2022";
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
