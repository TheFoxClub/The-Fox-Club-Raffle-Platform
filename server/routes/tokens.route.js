const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const TokenController = require("../controllers/tokens.controller");

// GET SPL Tokens and Token2022 Tokens of a wallet
router.get("/:pubkey", auth.bearer, TokenController.getUserTokens);

module.exports = router;
