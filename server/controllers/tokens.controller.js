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

class TokenController {
  static async getUserTokens(req, res) {
    try {
      const wallet = new PublicKey(req.params.pubkey);
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

            let name = null;
            let symbol = null;
            let uri = null;

            try {
              const metadata = await fetchMetadataFromSeeds(umi, {
                mint: publicKey(mint),
              });

              name = metadata.name;
              symbol = metadata.symbol;
              uri = metadata.uri;
            } catch (err) {
              logger.error("Metadata not found for mint:", mint);
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

      return respond(
        res,
        httpStatus.OK,
        { splTokens, token2022Tokens },
        "SPL Tokens and Token2022 Tokens Fetched Successfully"
      );
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to Fetch SPL Tokens and Token2022 Tokens"
      );
    }
  }
}

module.exports = TokenController;
