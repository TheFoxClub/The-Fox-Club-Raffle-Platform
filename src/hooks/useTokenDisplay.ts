import { useState, useEffect } from "react";
import {
  getTokenSymbolEnhanced,
  getTokenNameEnhanced,
} from "../utils/tokenUtils";

interface TokenDisplayData {
  symbol: string;
  name: string;
  loading: boolean;
}

export const useTokenDisplay = (
  tokenType: string,
  tokenAddress?: string,
): TokenDisplayData => {
  const [symbol, setSymbol] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTokenData = async () => {
      setLoading(true);
      try {
        const [enhancedSymbol, enhancedName] = await Promise.all([
          getTokenSymbolEnhanced(tokenType, tokenAddress),
          getTokenNameEnhanced(tokenType, tokenAddress),
        ]);

        setSymbol(enhancedSymbol);
        setName(enhancedName);
      } catch (error) {
        console.error("Error fetching token display data:", error);
        // Fallback to basic implementation
        const { getTokenSymbol, getTokenName } =
          await import("../utils/tokenUtils");
        setSymbol(getTokenSymbol(tokenType, tokenAddress));
        setName(getTokenName(tokenType, tokenAddress));
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [tokenType, tokenAddress]);

  return { symbol, name, loading };
};

// Hook for just symbol
export const useTokenSymbol = (
  tokenType: string,
  tokenAddress?: string,
): { symbol: string; loading: boolean } => {
  const { symbol, loading } = useTokenDisplay(tokenType, tokenAddress);
  return { symbol, loading };
};
