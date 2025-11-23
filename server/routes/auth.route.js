const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const AuthController = require("../controllers/auth.controller");

router.post("/auth/login", AuthController.login);

router.get("/auth/authenticate", auth.bearer, AuthController.authenticate);

router.post("/auth/logout", auth.bearer, AuthController.logout);

module.exports = router;
