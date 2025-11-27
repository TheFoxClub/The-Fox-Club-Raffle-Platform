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

module.exports = router;
