const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const isAdmin = require("../middlewares/isAdmin");
const HolderController = require("../controllers/nfts.controller");

// Get NFTs of a user from the collection configured in .env
router.get(
  "/onCollection/:pubkey",
  auth.bearer,
  HolderController.getUserNftsFromCollection
);

// Get all NFTs of a user
router.get("/:pubkey", auth.bearer, HolderController.getUserNfts);

// Clear cached NFTs of a user
router.get(
  "/holders/:pubkey/nfts/clear-cache",
  HolderController.clearUserNftsCache
);

// Get cache stats
router.get(
  "/holders/cache-stats",
  auth.bearer,
  isAdmin,
  HolderController.getCacheStats
);

module.exports = router;
