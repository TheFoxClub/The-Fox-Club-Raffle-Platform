const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const HolderController = require("../controllers/nfts.controller");

// Get NFTs of a user from the collection configured in .env
router.get(
  "/onCollection/:pubkey",
  auth.bearer,
  HolderController.getUserNftsFromCollection
);

// Get all NFTs of a user
router.get("/:pubkey", auth.bearer, HolderController.getUserNfts);

module.exports = router;
