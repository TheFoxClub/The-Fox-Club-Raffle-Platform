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
const crypto = require("crypto");

// SOLANA
const { ed25519 } = require("@noble/curves/ed25519");

const auth = require("../config/auth");
const { ADMIN_PUBKEYS } = require("../config/credentials");
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

const AUTH_CHALLENGE_TTL_MS = 5 * 60 * 1000;

const getPubkeyBase58 = (pubkeyHex) => {
  const bytes = Buffer.from(pubkeyHex, "hex");
  return base58.encode(bytes);
};

const issueAuthChallenge = (req, pubkeyBase58) => {
  const nonce = crypto.randomBytes(16).toString("hex");

  req.session.authChallenge = {
    nonce,
    pubkey: pubkeyBase58,
    expiresAt: Date.now() + AUTH_CHALLENGE_TTL_MS,
  };

  return nonce;
};

const consumeAuthChallenge = (req, pubkeyBase58, nonce) => {
  const challenge = req.session.authChallenge;

  delete req.session.authChallenge;

  if (!challenge) {
    return false;
  }

  return (
    challenge.pubkey === pubkeyBase58 &&
    challenge.nonce === nonce &&
    challenge.expiresAt > Date.now()
  );
};

class AuthController {
  static async challenge(req, res) {
    const pubkey = req.body.pubkey;

    if (!pubkey) {
      return respond(res, httpStatus.BAD_REQUEST, "Wallet public key is required");
    }

    try {
      const pubkeyBase58 = getPubkeyBase58(pubkey);
      const nonce = issueAuthChallenge(req, pubkeyBase58);

      return respond(res, httpStatus.OK, "Challenge created", {
        nonce,
        expiresInMs: AUTH_CHALLENGE_TTL_MS,
      });
    } catch (error) {
      logger.error(error);
      return respond(res, httpStatus.BAD_REQUEST, "Invalid wallet public key");
    }
  }

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
        isAdmin: ADMIN_PUBKEYS.includes(user.pubkey),
      },
    });
  }

  static async login(req, res, next) {
    const pubkey = req.body.pubkey;
    const blockchainNetwork = req.query.blockchainNetwork;

    if (!pubkey || !req.body.signature || !req.body.nonce) {
      return respond(res, httpStatus.BAD_REQUEST, "Missing login payload");
    }

    let pubkeyBase58;

    try {
      pubkeyBase58 = getPubkeyBase58(pubkey);
    } catch (error) {
      logger.error(error);
      return respond(res, httpStatus.BAD_REQUEST, "Invalid wallet public key");
    }

    const hasValidChallenge = consumeAuthChallenge(
      req,
      pubkeyBase58,
      req.body.nonce,
    );

    if (!hasValidChallenge) {
      return respond(
        res,
        httpStatus.UNAUTHORIZED,
        "Authentication challenge is missing, expired, or invalid",
      );
    }

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
        role: ADMIN_PUBKEYS.includes(dbUser.pubkey) ? "admin" : "customer",
      });

      const token = authUser.token;

      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 1 day expiration for the cookie
      });

      return respond(res, httpStatus.OK, "Logged In!", {
        user: {
          ...authUser,
          isAdmin: ADMIN_PUBKEYS.includes(authUser.pubkey),
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
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
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
