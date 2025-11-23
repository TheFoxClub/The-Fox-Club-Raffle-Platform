const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const AuthController = require("../controllers/auth.controller");

router.post("/login", AuthController.login);

router.get("/authenticate", auth.bearer, AuthController.authenticate);

router.post("/logout", auth.bearer, AuthController.logout);

module.exports = router;
