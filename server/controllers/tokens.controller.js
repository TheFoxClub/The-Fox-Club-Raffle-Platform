const { VerifiedToken, User } = require("../models");
const {
  fetchMetadataFromSeeds,
} = require("@metaplex-foundation/mpl-token-metadata");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { publicKey } = require("@metaplex-foundation/umi");

const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { Connection, PublicKey } = require("@solana/web3.js");
const { SOLANA_RPC_HOST } = require("../config/credentials");

const {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} = require("@solana/spl-token");
const redisClient = require("../util/redisClient");

const TOKENS_CACHE_TTL = process.env.TOKENS_CACHE_TTL || 300; // 5 minutes
const METADATA_CACHE_TTL = process.env.METADATA_CACHE_TTL || 3600; // 1 hour

class TokenController {
  static async getUserTokens(req, res) {
    try {
      const wallet = new PublicKey(req.params.pubkey);
      const walletAddress = wallet.toString();

      const tokensCacheKey = `tokens:all:${walletAddress}`;
      const metadataCacheKeyPrefix = `metadata:mint:`;

      const cachedTokens = await redisClient.get(tokensCacheKey);

      if (cachedTokens) {
        logger.info(`Cache hit for tokens: ${tokensCacheKey}`);
        return respond(
          res,
          httpStatus.OK,
          {
            splTokens: cachedTokens.splTokens,
            token2022Tokens: cachedTokens.token2022Tokens,
            cached: true,
            timestamp: cachedTokens.timestamp,
          },
          "SPL Tokens and Token2022 Tokens Fetched Successfully (Cached)"
        );
      }

      logger.info(
        `Cache miss for tokens: ${tokensCacheKey}, fetching from blockchain`
      );

      const connection = new Connection(SOLANA_RPC_HOST, "confirmed");
      const umi = createUmi(SOLANA_RPC_HOST);

      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(wallet, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(wallet, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);

      async function addMetadataForTokens(accounts) {
        return await Promise.all(
          accounts.value.map(async (acc) => {
            const mint = acc.account.data.parsed.info.mint;
            const metadataCacheKey = `${metadataCacheKeyPrefix}${mint}`;

            let name = null;
            let symbol = null;
            let uri = null;

            const cachedMetadata = await redisClient.get(metadataCacheKey);

            if (cachedMetadata) {
              logger.debug(`Cache hit for metadata: ${mint}`);
              name = cachedMetadata.name;
              symbol = cachedMetadata.symbol;
              uri = cachedMetadata.uri;
            } else {
              try {
                logger.debug(`Cache miss for metadata: ${mint}, fetching...`);
                const metadata = await fetchMetadataFromSeeds(umi, {
                  mint: publicKey(mint),
                });

                name = metadata.name;
                symbol = metadata.symbol;
                uri = metadata.uri;

                const metadataToCache = { name, symbol, uri };
                await redisClient.set(
                  metadataCacheKey,
                  metadataToCache,
                  METADATA_CACHE_TTL
                );
                logger.debug(`Cached metadata for mint: ${mint}`);
              } catch (err) {
                logger.debug(`Metadata not found for mint: ${mint}`);

                const notFoundMetadata = {
                  name: null,
                  symbol: null,
                  uri: null,
                };
                await redisClient.set(
                  metadataCacheKey,
                  notFoundMetadata,
                  TOKENS_CACHE_TTL
                );
              }
            }

            return {
              ...acc,
              metadata: {
                name,
                symbol,
                uri,
              },
            };
          })
        );
      }

      const splTokens = await addMetadataForTokens(tokenAccounts);
      const token2022Tokens = await addMetadataForTokens(token2022Accounts);

      const responseData = {
        splTokens,
        token2022Tokens,
        timestamp: new Date().toISOString(),
      };

      await redisClient.set(tokensCacheKey, responseData, TOKENS_CACHE_TTL);
      logger.info(`Cached tokens data for wallet: ${walletAddress}`);

      return respond(
        res,
        httpStatus.OK,
        {
          ...responseData,
          cached: false,
        },
        "SPL Tokens and Token2022 Tokens Fetched Successfully"
      );
    } catch (error) {
      logger.error(error);

      if (error.message.includes("Invalid public key")) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Invalid wallet address provided"
        );
      }

      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to Fetch SPL Tokens and Token2022 Tokens"
      );
    }
  }

  static async getUserVerifiedTokens(req, res) {
    try {
      const userId = req.payload.id;

      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        return respond(res, httpStatus.BAD_REQUEST, "User Not Found");
      }

      const wallet = new PublicKey(user.pubkey);
      const walletAddress = wallet.toString();

      const verifiedTokens = await VerifiedToken.findAll({
        where: { isVerified: true },
        attributes: ["address", "name", "decimals"],
        raw: true,
      });

      if (!verifiedTokens.length) {
        return respond(
          res,
          httpStatus.OK,
          {
            splTokens: [],
            token2022Tokens: [],
            cached: false,
            timestamp: new Date().toISOString(),
          },
          "No verified tokens found"
        );
      }

      const verifiedMintSet = new Set(verifiedTokens.map((t) => t.address));

      // Cache key based on wallet + verified mints
      const tokensCacheKey = `tokens:verified:${walletAddress}:${[
        ...verifiedMintSet,
      ].join(",")}`;

      const metadataCacheKeyPrefix = `metadata:mint:`;

      const cachedTokens = await redisClient.get(tokensCacheKey);
      if (cachedTokens) {
        logger.info(`Cache hit for tokens: ${tokensCacheKey}`);
        return respond(
          res,
          httpStatus.OK,
          {
            ...cachedTokens,
            cached: true,
          },
          "Verified Tokens Fetched Successfully (Cached)"
        );
      }

      logger.info(
        `Cache miss for tokens: ${tokensCacheKey}, fetching from blockchain`
      );

      const connection = new Connection(SOLANA_RPC_HOST, "confirmed");
      const umi = createUmi(SOLANA_RPC_HOST);

      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(wallet, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(wallet, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);

      const filterVerified = (accounts) =>
        accounts.value.filter((acc) =>
          verifiedMintSet.has(acc.account.data.parsed.info.mint)
        );

      const verifiedSplAccounts = filterVerified(tokenAccounts);
      const verifiedToken2022Accounts = filterVerified(token2022Accounts);

      async function addMetadataForTokens(accounts) {
        return Promise.all(
          accounts.map(async (acc) => {
            const mint = acc.account.data.parsed.info.mint;
            const metadataCacheKey = `${metadataCacheKeyPrefix}${mint}`;

            let name = null;
            let symbol = null;
            let uri = null;

            const cachedMetadata = await redisClient.get(metadataCacheKey);
            if (cachedMetadata) {
              ({ name, symbol, uri } = cachedMetadata);
            } else {
              try {
                const metadata = await fetchMetadataFromSeeds(umi, {
                  mint: publicKey(mint),
                });

                name = metadata.name;
                symbol = metadata.symbol;
                uri = metadata.uri;

                await redisClient.set(
                  metadataCacheKey,
                  { name, symbol, uri },
                  METADATA_CACHE_TTL
                );
              } catch {
                await redisClient.set(
                  metadataCacheKey,
                  { name: null, symbol: null, uri: null },
                  METADATA_CACHE_TTL
                );
              }
            }

            return {
              mint,
              amount: acc.account.data.parsed.info.tokenAmount,
              metadata: { name, symbol, uri },
            };
          })
        );
      }

      const splTokens = await addMetadataForTokens(verifiedSplAccounts);
      const token2022Tokens = await addMetadataForTokens(
        verifiedToken2022Accounts
      );

      const responseData = {
        splTokens,
        token2022Tokens,
        timestamp: new Date().toISOString(),
      };

      await redisClient.set(tokensCacheKey, responseData, TOKENS_CACHE_TTL);

      return respond(
        res,
        httpStatus.OK,
        {
          ...responseData,
          cached: false,
        },
        "Verified Tokens Fetched Successfully"
      );
    } catch (error) {
      logger.error(error);

      if (error.message.includes("Invalid public key")) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Invalid wallet address provided"
        );
      }

      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to fetch verified tokens"
      );
    }
  }

  static async getTokensByMint(req, res) {
    try {
      const { pubkey, mint } = req.params;
      const wallet = new PublicKey(pubkey);
      const mintAddress = mint;

      const cacheKey = `tokens:mint:${pubkey}:${mintAddress}`;

      const cachedToken = await redisClient.get(cacheKey);

      if (cachedToken) {
        logger.info(`Cache hit for token: ${cacheKey}`);
        return respond(
          res,
          httpStatus.OK,
          {
            token: cachedToken.token,
            cached: true,
            timestamp: cachedToken.timestamp,
          },
          "Token fetched successfully (Cached)"
        );
      }

      logger.info(
        `Cache miss for token: ${cacheKey}, fetching from blockchain`
      );

      const connection = new Connection(SOLANA_RPC_HOST, "confirmed");
      const umi = createUmi(SOLANA_RPC_HOST);

      const [splAccount, token2022Account] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(wallet, {
          mint: new PublicKey(mintAddress),
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(wallet, {
          mint: new PublicKey(mintAddress),
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);

      let token = null;
      let metadataCacheKey = `metadata:mint:${mintAddress}`;

      if (splAccount.value.length > 0) {
        token = splAccount.value[0];
      } else if (token2022Account.value.length > 0) {
        token = token2022Account.value[0];
      }

      if (token) {
        let name = null;
        let symbol = null;
        let uri = null;

        const cachedMetadata = await redisClient.get(metadataCacheKey);

        if (cachedMetadata) {
          name = cachedMetadata.name;
          symbol = cachedMetadata.symbol;
          uri = cachedMetadata.uri;
        } else {
          try {
            const metadata = await fetchMetadataFromSeeds(umi, {
              mint: publicKey(mintAddress),
            });

            name = metadata.name;
            symbol = metadata.symbol;
            uri = metadata.uri;

            await redisClient.set(
              metadataCacheKey,
              { name, symbol, uri },
              METADATA_CACHE_TTL
            );
          } catch (err) {
            logger.debug(`Metadata not found for mint: ${mintAddress}`);
          }
        }

        token.metadata = { name, symbol, uri };
      }

      const responseData = {
        token: token,
        timestamp: new Date().toISOString(),
      };

      if (token) {
        await redisClient.set(cacheKey, responseData, TOKENS_CACHE_TTL);
        logger.info(`Cached token data for ${pubkey}:${mintAddress}`);
      }

      return respond(
        res,
        httpStatus.OK,
        {
          ...responseData,
          cached: false,
          exists: !!token,
        },
        token ? "Token fetched successfully" : "Token not found for this wallet"
      );
    } catch (error) {
      logger.error(error);

      if (error.message.includes("Invalid public key")) {
        return respond(
          res,
          httpStatus.BAD_REQUEST,
          "Invalid wallet or mint address provided"
        );
      }

      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to fetch token"
      );
    }
  }

  static async clearTokenCache(req, res) {
    try {
      const { pubkey } = req.params;

      if (!pubkey) {
        return respond(res, httpStatus.BAD_REQUEST, "Missing wallet address");
      }

      const patterns = [`tokens:all:${pubkey}`, `tokens:mint:${pubkey}:*`];

      let clearedCount = 0;

      const mainKey = `tokens:all:${pubkey}`;
      if (await redisClient.del(mainKey)) {
        clearedCount++;
      }

      logger.info(`Token cache cleared for wallet: ${pubkey}`);

      return respond(res, httpStatus.OK, {
        cleared: clearedCount,
        message: "Token cache cleared successfully",
      });
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to clear token cache",
        {
          error: err.message,
        }
      );
    }
  }

  static async clearMetadataCache(req, res) {
    try {
      const { mint } = req.params;

      if (!mint) {
        return respond(res, httpStatus.BAD_REQUEST, "Missing mint address");
      }

      const metadataKey = `metadata:mint:${mint}`;
      const cleared = await redisClient.del(metadataKey);

      logger.info(`Metadata cache cleared for mint: ${mint}`);

      return respond(res, httpStatus.OK, {
        cleared: cleared ? 1 : 0,
        message: "Metadata cache cleared successfully",
      });
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to clear metadata cache",
        {
          error: err.message,
        }
      );
    }
  }

  static async getTokenCacheStats(req, res) {
    try {
      return respond(
        res,
        httpStatus.OK,
        {
          tokensCacheTTL: TOKENS_CACHE_TTL,
          metadataCacheTTL: METADATA_CACHE_TTL,
          redisConnected: redisClient.isConnected,
          timestamp: new Date().toISOString(),
        },
        "Token cache statistics"
      );
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to get token cache stats"
      );
    }
  }
}

module.exports = TokenController;
