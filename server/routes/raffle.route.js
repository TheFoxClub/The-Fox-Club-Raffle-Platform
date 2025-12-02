const express = require("express");
const RaffleController = require("../controllers/raffle.controller");
const auth = require("../config/auth");
const router = express.Router();

// Create a raffle
router.post("/create", auth.bearer, RaffleController.createRaffle);

// Get Raffle Draft
router.get("/draft", auth.bearer, RaffleController.getRaffleDraft);

//Get active / live raffles
router.get("/live", RaffleController.getLiveRaffles);

//Get Ended Raffle
router.get("/ended", RaffleController.getEndedRaffles);

// Get Featured Raffles
router.get("/featured", RaffleController.getFeaturedRaffles);

// Filter Raffles with search term, status, token-type, price, collection, page, limit
router.get("/filter", auth.bearer, RaffleController.filterRaffles);

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

module.exports = router;
