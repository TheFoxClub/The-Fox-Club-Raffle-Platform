const { User, UserCurrencyTransaction } = require("../models");
const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { parseSequelizeErrors } = require("../util/error");
const Op = require("sequelize").Op;
const bcrypt = require("bcryptjs");
const { VERIFICATION_CODE_TYPES } = require("../config/data");
const { QueryTypes, Model } = require("sequelize");
const { default: base58 } = require("bs58");

// SOLANA
const { ed25519 } = require("@noble/curves/ed25519");

const auth = require("../config/auth");
const { ADMIN_PUBKEY } = require("../config/credentials");
const UserController = require("./user.controller");
// const UserController = require("./user.controller");
// const { getAllPendingCurrencyAmount } = require("../services/currency");

const verifySignatureSolana = ({ signatureHex, nonce, pubkeyHex }) => {
  try {
    const message = `Sign this message for authenticating with your wallet. Nonce: ${nonce}`;
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Uint8Array.from(
      signatureHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );
    const pubkeyBytes = Uint8Array.from(
      pubkeyHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );

    // Verify that the bytes were signed using the private key that matches the known public key
    if (!ed25519.verify(signatureBytes, messageBytes, pubkeyBytes))
      throw new Error("Invalid signature!");

    return true;
  } catch (err) {
    logger.error(err);
    return false;
  }
};

const handleError = async (res, err) => {
  logger.error(err);
  respond(res, httpStatus.INTERNAL_SERVER_ERROR, parseSequelizeErrors(err));
};

class AuthController {
  static async authenticate(req, res) {
    const user = await User.findOne({
      raw: true,
      where: {
        id: req.payload.id,
        pubkey: req.payload.pubkey,
      },
      attributes: ["id", "blockchainNetwork", "pubkey"],
    });

    if (!user) {
      return respond(res, httpStatus.UNAUTHORIZED, "Not authenticated!");
    }

    return respond(res, httpStatus.OK, "Successful", {
      user: {
        ...user,
        isAuthenticated: true,
        isAdmin: ADMIN_PUBKEY.includes(user.pubkey),
      },
    });
  }

  static async login(req, res, next) {
    const pubkey = req.body.pubkey;
    const blockchainNetwork = req.query.blockchainNetwork;
    //hex to base58
    const bytes = Buffer.from(pubkey, "hex");
    const pubkeyBase58 = base58.encode(bytes);

    let isValid = false;

    switch (blockchainNetwork) {
      case "solana":
        isValid = await verifySignatureSolana({
          nonce: req.body.nonce,
          pubkeyHex: pubkey,
          signatureHex: req.body.signature,
        });
        break;
      default:
        isValid = false;
        break;
    }

    if (!isValid)
      return respond(res, httpStatus.OK, "Invalid Signature! Unauthorized!!");

    try {
      let dbUser = await User.findOne({
        where: {
          pubkey: pubkeyBase58,
        },
      });

      if (!dbUser) {
        dbUser = await User.create({
          pubkey: pubkeyBase58,
          blockchainNetwork: 1,
        });
      }

      const authUser = auth.toAuthJSON({
        pubkey: pubkeyBase58,
        id: dbUser.id,
        role: ADMIN_PUBKEY.includes(dbUser.pubkey) ? "admin" : "customer",
      });

      const token = authUser.token;

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000, // 1 day expiration for the cookie
        // sameSite: "strict", // Helps mitigate CSRF attacks
      });

      return respond(res, httpStatus.OK, "Logged In!", {
        user: {
          ...authUser,
          isAdmin: ADMIN_PUBKEY.includes(authUser.pubkey),
        },
      });
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Internal Server Error"
      );
    }
  }

  static async logout(req, res, next) {
    try {
      res.clearCookie("token", {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production", // Uncomment in production
        // sameSite: "strict", // Uncomment to help mitigate CSRF attacks
      });

      return respond(res, httpStatus.OK, "Logged out successfully!");
    } catch (error) {
      logger.error(error);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to log out"
      );
    }
  }
}

module.exports = AuthController;
