const express = require("express");
const AdminController = require("../controllers/admin.controller");
const auth = require("../config/auth");
const isAdmin = require("../middlewares/isAdmin");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// Get all raffles
router.get("/raffles", auth.bearer, isAdmin, AdminController.getAllRaffles);

// Toggle featured status for a raffle
router.put(
  "/featured/:id",
  auth.bearer,
  isAdmin,
  AdminController.toggleFeaturedStatus,
);

// Toggle suspend status for a raffle (suspend <=> resume)
router.put(
  "/suspend/:id",
  auth.bearer,
  isAdmin,
  AdminController.toggleSuspendStatus,
);

// Upload Verified Collection via CSV
router.post(
  "/verified-collection/bulk-upload",
  auth.bearer,
  isAdmin,
  upload.single("file"),
  AdminController.bulkUploadFromCSV,
);

// Create new Verified Collection
router.post(
  "/verified-collection",
  auth.bearer,
  isAdmin,
  AdminController.createVerifiedCollection,
);

// Get all Verified Collections (with pagination)
router.get(
  "/verified-collection",
  auth.bearer,
  isAdmin,
  AdminController.getAllVerifiedCollections,
);

// Get single Verified Collection by ID
router.get(
  "/verified-collection/:id",
  auth.bearer,
  isAdmin,
  AdminController.getVerifiedCollectionById,
);

// Update Verified Collection
router.put(
  "/verified-collection/:id",
  auth.bearer,
  isAdmin,
  AdminController.updateVerifiedCollection,
);

// Delete Verified Collection
router.delete(
  "/verified-collection/:id",
  auth.bearer,
  isAdmin,
  AdminController.deleteVerifiedCollection,
);

// Bulk delete Verified Collections
router.delete(
  "/verified-collection/bulk/delete",
  auth.bearer,
  isAdmin,
  AdminController.bulkDeleteCollections,
);

// Toggle verification status
router.patch(
  "/verified-collection/:id/toggle-verify",
  auth.bearer,
  isAdmin,
  AdminController.toggleVerification,
);

// Get Collection Name from Collection Address
router.get(
  "/collection-name/lookup",
  auth.bearer,
  isAdmin,
  AdminController.lookupCollectionByAddress,
);

// Get Top Creators
router.get(
  "/top-creators",
  auth.bearer,
  isAdmin,
  AdminController.getTopRaffleCreators,
);

// Get Dashboard Stats
router.get(
  "/dashboard-stats",
  auth.bearer,
  isAdmin,
  AdminController.getDashboardStats,
);

// Get Top Performing Raffles
router.get(
  "/top-raffles",
  auth.bearer,
  isAdmin,
  AdminController.getTopPerformingRaffles,
);

// Get top hosts and buyers
router.get("/leaderboard", AdminController.getTopHostsAndBuyers);

// Verified Tokens Routes:
// Add new Token
router.post(
  "/verified-token",
  auth.bearer,
  isAdmin,
  AdminController.createVerifiedToken,
);

// Get all Tokens (with pagination)
router.get(
  "/verified-token",
  auth.bearer,
  isAdmin,
  AdminController.getAllTokens,
);

// Get All Verified Tokens
router.get(
  "/verified-token/verified",
  auth.bearer,
  isAdmin,
  AdminController.getAllVerifiedTokens,
);

// Get single Token by ID
router.get(
  "/verified-token/:id",
  auth.bearer,
  isAdmin,
  AdminController.getVerifiedTokenById,
);

// Delete Token
router.delete(
  "/verified-token/:id",
  auth.bearer,
  isAdmin,
  AdminController.deleteVerifiedToken,
);

// Toggle verification status
router.patch(
  "/verified-token/:id/toggle-verify",
  auth.bearer,
  isAdmin,
  AdminController.toggleTokenVerification,
);

// Toggle payment token status
router.patch(
  "/verified-token/:id/toggle-payment",
  auth.bearer,
  isAdmin,
  AdminController.togglePaymentToken,
);

// XP Management Routes
// Get XP configuration
router.get("/xp-config", auth.bearer, isAdmin, AdminController.getXpConfig);

// Update XP configuration
router.put("/xp-config", auth.bearer, isAdmin, AdminController.updateXpConfig);

// Get XP leaderboard
router.get(
  "/xp-leaderboard",
  auth.bearer,
  isAdmin,
  AdminController.getXpLeaderboard,
);

// Get XP analytics
router.get(
  "/xp-analytics",
  auth.bearer,
  isAdmin,
  AdminController.getXpAnalytics,
);

// Get XP processing status
router.get(
  "/xp-processing-status",
  auth.bearer,
  isAdmin,
  AdminController.getXpProcessingStatus,
);

// Get XP records with filtering
router.get("/xp-records", auth.bearer, isAdmin, AdminController.getXpRecords);

// Manually recalculate user XP
router.post(
  "/xp-recalculate/:userId",
  auth.bearer,
  isAdmin,
  AdminController.recalculateUserXp,
);

// System Fees configurations
router.get("/system-fee", auth.bearer, AdminController.getSystemFees);
router.put(
  "/system-fee",
  auth.bearer,
  isAdmin,
  AdminController.updateSystemFees,
);

module.exports = router;
