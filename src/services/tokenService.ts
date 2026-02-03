import { getAllVerifiedTokens } from "../views/raffle/api";

export interface VerifiedToken {
  id: string | number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  tokenType: number;
  programId: string | null;
  isBuiltIn?: boolean;
}

class TokenService {
  private verifiedTokens: Map<string, VerifiedToken> = new Map();
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private fetchPromise: Promise<void> | null = null;

  async getVerifiedTokens(): Promise<Map<string, VerifiedToken>> {
    const now = Date.now();

    // If we have a fetch in progress, wait for it
    if (this.fetchPromise) {
      await this.fetchPromise;
      return this.verifiedTokens;
    }

    // If cache is still valid, return it
    if (
      now - this.lastFetch < this.CACHE_DURATION &&
      this.verifiedTokens.size > 0
    ) {
      return this.verifiedTokens;
    }

    // Start a new fetch
    this.fetchPromise = this.fetchVerifiedTokens();
    await this.fetchPromise;
    this.fetchPromise = null;

    return this.verifiedTokens;
  }

  private async fetchVerifiedTokens(): Promise<void> {
    try {
      const response = await getAllVerifiedTokens();

      if (response.success && response.data?.tokens) {
        this.verifiedTokens.clear();

        response.data.tokens.forEach((token: VerifiedToken) => {
          this.verifiedTokens.set(token.address, token);
        });

        this.lastFetch = Date.now();
      }
    } catch (error) {
      console.error("Failed to fetch verified tokens:", error);
      // Don't clear existing cache on error, just log it
    }
  }

  async getTokenByAddress(address: string): Promise<VerifiedToken | null> {
    const tokens = await this.getVerifiedTokens();
    return tokens.get(address) || null;
  }

  async getTokenSymbol(address: string): Promise<string | null> {
    const token = await this.getTokenByAddress(address);
    return token?.symbol || null;
  }

  async getTokenName(address: string): Promise<string | null> {
    const token = await this.getTokenByAddress(address);
    return token?.name || null;
  }

  // Clear cache manually if needed
  clearCache(): void {
    this.verifiedTokens.clear();
    this.lastFetch = 0;
  }
}

export const tokenService = new TokenService();
