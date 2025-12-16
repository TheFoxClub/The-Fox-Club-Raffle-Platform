const express = require("express");
const AnalyticsController = require("../controllers/analytics.controller");
const isAdmin = require("../middlewares/isAdmin");
const auth = require("../config/auth");
const router = express.Router();

router.get("/", auth.bearer, isAdmin, AnalyticsController.getAnalytics);

module.exports = router;
