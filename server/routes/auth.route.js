const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const AuthController = require("../controllers/auth.controller");
const { authRateLimiter } = require("../middlewares/rateLimiter");

router.post("/challenge", authRateLimiter, AuthController.challenge);

router.post("/login", authRateLimiter, AuthController.login);

router.get("/authenticate", auth.bearer, AuthController.authenticate);

router.post("/logout", AuthController.logout);

module.exports = router;
