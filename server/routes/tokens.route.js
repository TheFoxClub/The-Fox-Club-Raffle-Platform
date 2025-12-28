const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const TokenController = require("../controllers/tokens.controller");
const isAdmin = require("../middlewares/isAdmin");

// Get Verified Tokens of logged in user
router.get("/verified", auth.bearer, TokenController.getUserVerifiedTokens);

// GET SPL Tokens and Token2022 Tokens of a wallet
router.get("/:pubkey", auth.bearer, TokenController.getUserTokens);

router.get("/:pubkey/mint/:mint", TokenController.getTokensByMint);
router.delete("/cache/:pubkey", TokenController.clearTokenCache);
router.delete("/metadata-cache/:mint", TokenController.clearMetadataCache);
router.get(
  "/cache/stats",
  auth.bearer,
  isAdmin,
  TokenController.getTokenCacheStats
);

module.exports = router;
