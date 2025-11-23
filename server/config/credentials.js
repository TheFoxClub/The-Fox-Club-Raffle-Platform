const dotenv = require("dotenv");
dotenv.config();

module.exports.SERVER_PORT = process.env.SERVER_PORT;

module.exports.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : "https://foxclub.solanaskypilots.com/";

module.exports.ADMIN_PUBKEY = process.env.ADMIN_PUBKEY;

module.exports.JWT_SECRET = process.env.JWT_SECRET || "secret-key";
