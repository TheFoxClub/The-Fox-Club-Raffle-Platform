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

module.exports = router;
