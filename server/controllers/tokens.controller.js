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

      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(wallet, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(wallet, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);

      const tokens = {
        splTokens: tokenAccounts.value,
        token2022Tokens: token2022Accounts.value,
      };
      return respond(
        res,
        httpStatus.OK,
        tokens,
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
