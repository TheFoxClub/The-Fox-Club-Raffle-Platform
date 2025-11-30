const express = require("express");
const AdminController = require("../controllers/admin.controller");
const auth = require("../config/auth");
const isAdmin = require("../middlewares/isAdmin");
const router = express.Router();

// Get all raffles
router.get("/raffles", auth.bearer, isAdmin, AdminController.getAllRaffles);

// Toggle featured status for a raffle
router.put(
  "/featured/:id",
  auth.bearer,
  isAdmin,
  AdminController.toggleFeaturedStatus
);

// Toggle suspend status for a raffle (suspend <=> resume)
router.put(
  "/suspend/:id",
  auth.bearer,
  isAdmin,
  AdminController.toggleSuspendStatus
);

// Upload Verified Collection
router.post(
  "/verified-collection",
  auth.bearer,
  isAdmin,
  AdminController.createOrUpdateVerifiedCollection
);

//Get Verified Collections
router.get(
  "/verified-collection",
  auth.bearer,
  isAdmin,
  AdminController.getAllVerifiedCollections
);

module.exports = router;
