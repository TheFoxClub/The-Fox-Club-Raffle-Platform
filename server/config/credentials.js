const dotenv = require("dotenv");
dotenv.config();

module.exports.SERVER_PORT = process.env.SERVER_PORT;

module.exports.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : "https://foxclub.solanaskypilots.com/";

module.exports.SOLANA_RPC_HOST = process.env.REACT_APP_SOLANA_RPC_HOST;
module.exports.SOLANA_RPC_POOL_DAS_API =
  process.env.REACT_APP_SOLANA_RPC_POOL_DAS_API;
module.exports.REACT_APP_SOLANA_NETWORK = process.env.REACT_APP_SOLANA_NETWORK;

module.exports.ADMIN_PUBKEY = process.env.ADMIN_PUBKEY;

module.exports.BET_RECEIVER_WALLET = process.env.BET_RECEIVER_WALLET;

module.exports.JWT_SECRET = process.env.JWT_SECRET || "secret-key";

module.exports.COLLECTION_ADDRESS = process.env.COLLECTION_ADDRESS || "";
