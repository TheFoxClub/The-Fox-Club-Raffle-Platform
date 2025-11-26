const express = require("express");
const UserController = require("../controllers/user.controller");
const router = express.Router();


// GET /user?userId=123
router.get("/info/:userId", UserController.getUserInfo);

// POST /user/info
router.post("/info", UserController.postUserInfo);

// PUT /user/info (update)
router.put("/info", UserController.updateUserInfo);

module.exports = router;
