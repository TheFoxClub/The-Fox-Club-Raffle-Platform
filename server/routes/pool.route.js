const express = require("express");
const PoolController = require("../controllers/pool.controller");
const router = express.Router();
const auth = require("../config/auth");
const isAdmin = require("../middlewares/isAdmin");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", auth.bearer, isAdmin, PoolController.getPools);

router.post("/", auth.bearer, isAdmin, PoolController.addWalletToPool);

router.delete("/", auth.bearer, isAdmin, PoolController.deleteWalletFromPool);

// Upload Wallet Addresses via CSV
router.post(
  "/bulk-upload",
  auth.bearer,
  isAdmin,
  upload.single("file"),
  PoolController.bulkCSVAddWalletsToPool
);

module.exports = router;
