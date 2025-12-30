const express = require("express");
const RaffleController = require("../controllers/raffle.controller");
const auth = require("../config/auth");
const { payoutRateLimiter } = require("../middlewares/rateLimiter");
const router = express.Router();

// Create a raffle
router.post("/create", auth.bearer, RaffleController.createRaffle);

// Complete raffle creation after reward transfer
router.post("/complete-creation", auth.bearer, RaffleController.completeRaffleCreation);

// Store reward transfer signature
router.post("/store-reward-signature", auth.bearer, RaffleController.storeRewardSignature);

// Claim reward
router.post("/claim-reward", auth.bearer, RaffleController.claimReward);

// Submit claim transaction
router.post("/submit-claim", auth.bearer, RaffleController.submitClaim);

// Get claimable rewards
router.get(
  "/claimable-rewards",
  auth.bearer,
  RaffleController.getClaimableRewards
);

// Update Raffle Draft
router.put("/draft/:raffleId", auth.bearer, RaffleController.updateDraftRaffle);

// Delete Raffle Draft
router.delete(
  "/draft/:raffleId",
  auth.bearer,
  RaffleController.deleteDraftRaffle
);

// Get Raffle Draft
router.get("/draft", auth.bearer, RaffleController.getRaffleDraft);

//Get active / live raffles
router.get("/live", RaffleController.getLiveRaffles);

//Get Ended Raffle
router.get("/ended", RaffleController.getEndedRaffles);

//Get Upcoming Raffle
router.get("/upcoming", RaffleController.getUpcomingRaffles);

// Get Featured Raffles
router.get("/featured", RaffleController.getFeaturedRaffles);

// Filter Raffles with search term, status, token-type, price, collection, page, limit
router.get("/filter", RaffleController.filterRaffles);

// Get user's hosted raffles with payout information
router.get("/user/hosted", auth.bearer, RaffleController.getUserHostedRaffles);

// Claim raffle creator payout
router.post("/payout/claim", payoutRateLimiter, auth.bearer, RaffleController.claimCreatorPayout);

// Submit payout transaction signature
router.post("/payout/submit", payoutRateLimiter, auth.bearer, RaffleController.submitPayoutTransaction);

// Get user's wins across all raffles
router.get("/user/wins", auth.bearer, RaffleController.getUserWins);

// Get a raffle by ID with Raffle Details
router.get("/:id", RaffleController.getRaffleById);

// Get Raffles by User ID
router.get("/user/:userId", auth.bearer, RaffleController.getRafflesByUserId);

// Update Raffle By ID
router.put("/:id", auth.bearer, RaffleController.updateRaffle);

// Delete Raffle : only by owner, only if no tickets sold
router.delete("/:id", auth.bearer, RaffleController.deleteRaffle);

// End a Raffle : only by owner
router.post("/:id/end", auth.bearer, RaffleController.endRaffle);

// Select winners for a raffle - only by owner
router.post("/:id/select-winners", auth.bearer, RaffleController.selectWinners);

// Get winners for a raffle
router.get("/:id/winners", RaffleController.getRaffleWinners);



module.exports = router;
