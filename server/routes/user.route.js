const express = require("express");
const UserController = require("../controllers/user.controller");
const router = express.Router();
const auth = require("../config/auth");

// Get User Info
router.get("/info", auth.bearer, UserController.getUserInfo);

// Get Any User Info by ID
router.get("/info/:id", UserController.getAnyUserInfo);

// Create or Update User Info
router.put("/info", auth.bearer, UserController.createOrUpdateUserInfo);

// XP Routes
// Get user's XP summary
router.get("/xp", auth.bearer, UserController.getUserXp);

// Get user's XP history
router.get("/xp/history", auth.bearer, UserController.getUserXpHistory);

// Get user's XP rank
router.get("/xp/rank", auth.bearer, UserController.getUserXpRank);

// Get XP leaderboard (public)
router.get("/xp/leaderboard", UserController.getXpLeaderboard);

module.exports = router;
