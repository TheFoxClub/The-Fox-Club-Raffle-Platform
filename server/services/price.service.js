const { VerifiedToken } = require("../models");
const { SPL_TOKEN_ADDRESS, TOKEN_TYPE } = require("../config/data");
const logger = require("../util/logger");
const redisClient = require("../util/redisClient");
const { default: axios } = require("axios");
const { JUPITER_API_KEY } = require("../config/credentials");

class PriceService {
  /**
   * Get real-time USD price for a token
   * @param {string} tokenAddress - Token mint address
   * @param {string} tokenSymbol - Token symbol for logging
   * @returns {Promise<number>} USD price or 0 if not found
   */
  static async getTokenUsdPrice(tokenAddress, tokenSymbol = "Unknown") {
    try {
      // USDC is always 1:1 with USD
      if (tokenAddress === SPL_TOKEN_ADDRESS.USDC) {
        return 1.0;
      }

      // SOL special handling
      if (tokenAddress === SPL_TOKEN_ADDRESS.SOLANA) {
        return await this.getSolPrice();
      }

      // Try cache first
      const cachedPrice = await this.getCachedPrice(tokenAddress);
      if (cachedPrice !== null) {
        logger.debug(`Using cached price for ${tokenSymbol}: $${cachedPrice}`);
        return cachedPrice;
      }

      // Try real-time price APIs
      const realTimePrice = await this.fetchRealTimePrice(
        tokenAddress,
        tokenSymbol
      );
      if (realTimePrice > 0) {
        await this.cachePrice(tokenAddress, realTimePrice);
        logger.info(
          `Fetched real-time price for ${tokenSymbol}: $${realTimePrice}`
        );
        return realTimePrice;
      }

      // No price found - award 0 XP with warning
      logger.warn(
        `No USDC equivalent price found for token ${tokenSymbol} (${tokenAddress}), awarding 0 XP`
      );
      return 0;
    } catch (error) {
      logger.error(
        `Error getting token price for ${tokenSymbol}: ${error.message}`
      );
      return 0;
    }
  }

  /**
   * Get SOL price from multiple sources
   * @returns {Promise<number>} SOL price in USD
   */
  static async getSolPrice() {
    try {
      // Check if we're on devnet/testnet - use mock price for testing
      if (this.isDevnetEnvironment()) {
        const mockPrice = this.getMockSolPrice();
        logger.info(`Using mock SOL price for devnet/testing: $${mockPrice}`);
        return mockPrice;
      }

      // Try cache first
      const cachedPrice = await this.getCachedPrice("SOL");
      if (cachedPrice !== null) {
        return cachedPrice;
      }

      // Try CoinGecko API for SOL
      const solPrice = await this.fetchSolFromCoinGecko();
      if (solPrice > 0) {
        await this.cachePrice("SOL", solPrice);
        logger.info(`Fetched SOL price from CoinGecko: $${solPrice}`);
        return solPrice;
      }

      // Try Jupiter API as fallback
      const jupiterPrice = await this.fetchSolFromJupiter();
      if (jupiterPrice > 0) {
        await this.cachePrice("SOL", jupiterPrice);
        logger.info(`Fetched SOL price from Jupiter: $${jupiterPrice}`);
        return jupiterPrice;
      }

      logger.warn("No SOL price found from any source, awarding 0 XP");
      return 0;
    } catch (error) {
      logger.error(`Error fetching SOL price: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if we're running in devnet/testnet environment
   * @returns {boolean} True if devnet/testnet
   */
  static isDevnetEnvironment() {
    // Check environment variables or other indicators
    const nodeEnv = process.env.NODE_ENV;
    const solanaCluster = process.env.SOLANA_CLUSTER;
    const useMockPrices = process.env.USE_MOCK_PRICES;

    return (
      nodeEnv === "development" ||
      solanaCluster === "devnet" ||
      solanaCluster === "testnet" ||
      useMockPrices === "true"
    );
  }

  /**
   * Get mock price for testing environments
   * @returns {number} Mock SOL price
   */
  static getMockSolPrice() {
    // Use environment variable if set, otherwise default to $97
    const mockPrice = parseFloat(process.env.MOCK_SOL_PRICE || "97.0");
    return mockPrice;
  }

  /**
   * Fetch real-time price for SPL tokens
   * @param {string} tokenAddress - Token mint address
   * @param {string} tokenSymbol - Token symbol
   * @returns {Promise<number>} Token price in USD
   */
  static async fetchRealTimePrice(tokenAddress, tokenSymbol) {
    try {
      // Try Jupiter API first (better for SPL tokens)
      const jupiterPrice = await this.fetchFromJupiter(tokenAddress);
      if (jupiterPrice > 0) {
        return jupiterPrice;
      }

      // Try CoinGecko as fallback
      const coinGeckoPrice = await this.fetchFromCoinGecko(
        tokenAddress,
        tokenSymbol
      );
      if (coinGeckoPrice > 0) {
        return coinGeckoPrice;
      }

      return 0;
    } catch (error) {
      logger.error(
        `Error fetching real-time price for ${tokenSymbol}: ${error.message}`
      );
      return 0;
    }
  }

  /**
   * Fetch SOL price from CoinGecko
   * @returns {Promise<number>} SOL price in USD
   */
  static async fetchSolFromCoinGecko() {
    try {
      const https = require("https");
      const url =
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

      return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              const price = parsed?.solana?.usd;
              resolve(price && price > 0 ? price : 0);
            } catch (error) {
              resolve(0);
            }
          });
        });

        req.on("error", () => resolve(0));
        req.setTimeout(5000, () => {
          req.destroy();
          resolve(0);
        });
      });
    } catch (error) {
      return 0;
    }
  }

  /**
   * Fetch token price from Jupiter API
   * @param {string} tokenAddress - Token mint address
   * @returns {Promise<number>} Token price in USD
   */
  static async fetchFromJupiter(tokenAddress) {
    try {
      const url = `https://api.jup.ag/price/v3?ids=${tokenAddress}`;

      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          "X-API-KEY": `${JUPITER_API_KEY}`,
        },
      });

      const price = response?.data?.[tokenAddress]?.usdPrice;

      return price && price > 0 ? price : 0;
    } catch (error) {
      logger.error("error fetching from jupiter:", error.message);
      return 0;
    }
  }

  /**
   * Fetch SOL price from Jupiter API
   * @returns {Promise<number>} SOL price in USD
   */
  static async fetchSolFromJupiter() {
    return await this.fetchFromJupiter(SPL_TOKEN_ADDRESS.SOLANA);
  }

  /**
   * Fetch token price from CoinGecko (for tokens with known CoinGecko IDs)
   * @param {string} tokenAddress - Token mint address
   * @param {string} tokenSymbol - Token symbol
   * @returns {Promise<number>} Token price in USD
   */
  static async fetchFromCoinGecko(tokenAddress, tokenSymbol) {
    try {
      // This would require mapping token addresses to CoinGecko IDs
      // For now, return 0 as most SPL tokens aren't on CoinGecko
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get cached price for a token
   * @param {string} tokenKey - Token address or symbol
   * @returns {Promise<number|null>} Cached price or null
   */
  static async getCachedPrice(tokenKey) {
    try {
      const cacheKey = `price:${tokenKey}:usd`;
      const cached = await redisClient.get(cacheKey);
      return cached ? parseFloat(cached) : null;
    } catch (error) {
      // Redis not available, return null
      return null;
    }
  }

  /**
   * Cache token price
   * @param {string} tokenKey - Token address or symbol
   * @param {number} price - Price in USD
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   * @returns {Promise<void>}
   */
  static async cachePrice(tokenKey, price, ttl = 300) {
    try {
      const cacheKey = `price:${tokenKey}:usd`;
      await redisClient.set(cacheKey, price.toString(), ttl);
    } catch (error) {
      // Redis not available, skip caching
      logger.debug(`Could not cache price for ${tokenKey}: ${error.message}`);
    }
  }

  /**
   * Get batch prices for multiple tokens
   * @param {Array} tokens - Array of {address, symbol} objects
   * @returns {Promise<Object>} Object with address as key and price as value
   */
  static async getBatchTokenPrices(tokens) {
    const prices = {};

    // Process tokens in parallel but limit concurrency
    const batchSize = 5;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const batchPromises = batch.map(async (token) => {
        const price = await this.getTokenUsdPrice(token.address, token.symbol);
        return { address: token.address, price };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result) => {
        prices[result.address] = result.price;
      });
    }

    return prices;
  }
}

module.exports = PriceService;
