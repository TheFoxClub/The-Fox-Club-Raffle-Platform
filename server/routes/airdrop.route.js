const express = require("express");
const AirdropController = require("../controllers/airdrop.controller");
const auth = require("../config/auth");
const isAdmin = require("../middlewares/isAdmin");

const router = express.Router();

// Public periodic leaderboard based on latest airdrop period
router.get("/periodic-leaderboard", AirdropController.getLatestPeriodicLeaderboard);

// ==============================
// Admin Routes (Protected)
// ==============================

// Get XP leaderboard for recipient selection
router.get(
  "/xp-leaderboard",
  auth.bearer,
  isAdmin,
  AirdropController.getXpLeaderboard
);

// Get all airdrops (with pagination and filtering)
router.get("/", auth.bearer, isAdmin, AirdropController.getAllAirdrops);

// Prepare airdrop funding transaction (returns tx for user to sign)
router.post("/prepare-funding", auth.bearer, isAdmin, AirdropController.prepareAirdropFunding);

// Confirm airdrop funding and create (after user signs and submits tx)
router.post("/confirm-funding", auth.bearer, isAdmin, AirdropController.confirmAirdropFunding);

// Update airdrop status (fund, activate, cancel)
router.put("/:id/status", auth.bearer, isAdmin, AirdropController.updateAirdropStatus);

// ==============================
// User Routes (Protected)
// ==============================

// Get user's unclaimed rewards
router.get(
  "/user/unclaimed",
  auth.bearer,
  AirdropController.getUserUnclaimedRewards
);

// Prepare claim transaction (returns partially signed tx for user to complete)
router.post(
  "/user/prepare-claim/:rewardId",
  auth.bearer,
  AirdropController.prepareAirdropClaim
);

// Confirm reward claim (after user signs and submits tx)
router.post(
  "/user/claim/:rewardId",
  auth.bearer,
  AirdropController.claimReward
);

module.exports = router;
