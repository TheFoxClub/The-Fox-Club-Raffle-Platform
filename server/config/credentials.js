require("./loadEnv");

const requireEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const parseCommaSeparated = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

module.exports.SERVER_PORT = process.env.PORT || process.env.SERVER_PORT;

module.exports.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? parseCommaSeparated(process.env.ALLOWED_ORIGINS)
  : ["http://localhost:3000"];

module.exports.SOLANA_RPC_HOST = process.env.REACT_APP_SOLANA_RPC_HOST;
module.exports.SOLANA_RPC_POOL_DAS_API =
  process.env.REACT_APP_SOLANA_RPC_POOL_DAS_API;
module.exports.REACT_APP_SOLANA_NETWORK = process.env.REACT_APP_SOLANA_NETWORK;

module.exports.ADMIN_PUBKEYS = process.env.ADMIN_PUBKEY
  ? parseCommaSeparated(process.env.ADMIN_PUBKEY)
  : [];

module.exports.FUND_RECEIVER_WALLET = process.env.FUND_RECEIVER_WALLET;

module.exports.JWT_SECRET = requireEnv("JWT_SECRET");

module.exports.SESSION_SECRET = requireEnv("SESSION_SECRET");

module.exports.CHECKSUM_SECRET_KEY = requireEnv("CHECKSUM_SECRET_KEY");

module.exports.COLLECTION_ADDRESS = process.env.COLLECTION_ADDRESS
  ? parseCommaSeparated(process.env.COLLECTION_ADDRESS)
  : "";

module.exports.JUPITER_API_KEY = process.env.JUPITER_API_KEY;
