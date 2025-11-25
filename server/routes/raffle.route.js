const express = require("express");
const RaffleController = require("../controllers/raffle.controller");
const router = express.Router();

// PUBLIC ROUTES - No authentication required

/**
 * Get all active raffles
 * Returns raffles that are currently live (between startDate and endDate, not ended)
 */
router.get("/active", RaffleController.getActiveRaffles);

/**
 * Get featured raffles for homepage display
 * Returns raffles marked as featured with valid featuredUntil date
 */
router.get("/featured", RaffleController.getFeaturedRaffles);

/**
 * Get single raffle by ID
 * Returns complete raffle details including progress percentage
 */
router.get("/:id", RaffleController.getRaffleById);

/**
 * Get all raffles by a specific user
 * Returns all raffles created by the specified user
 */
router.get("/user/:userId", RaffleController.getRafflesByUserId);

// USER ROUTES - Require authentication (add auth middleware when available)
// TODO: Add authentication middleware - e.g., router.use(authMiddleware);

/**
 * Create a new raffle
 * Requires: title, totalTickets, ticketPrice, startDate, endDate
 * Optional: description, imageUrl, tokenType, numberOfWinners, NFT verification settings
 */
router.post("/", RaffleController.createRaffle);

/**
 * Update an existing raffle
 * Only the raffle owner can update
 * Cannot update after tickets have been sold
 */
router.put("/:id", RaffleController.updateRaffle);

/**
 * Delete a raffle
 * Only the raffle owner can delete
 * Cannot delete if tickets have been sold
 */
router.delete("/:id", RaffleController.deleteRaffle);

/**
 * Buy ticket(s) for a raffle
 * Requires: quantity, walletAddress, transactionSignature
 * Validates raffle is active and tickets are available
 */
router.post("/:id/buy-ticket", RaffleController.buyTicket);

/**
 * Manually end a raffle
 * Only the raffle owner can end their raffle
 * Triggers winner selection process
 */
router.post("/:id/end", RaffleController.endRaffle);

// ADMIN ROUTES - Require admin authentication
// TODO: Add admin authentication middleware - e.g., router.use('/admin', adminMiddleware);

/**
 * Get all raffles (admin view)
 * Supports filtering by status: live, ended, upcoming
 * Supports pagination: page, limit
 */
router.get("/admin/all", RaffleController.getAllRaffles);

/**
 * Toggle featured status for a raffle
 * Admins can mark raffles as featured for homepage display
 * Requires: isFeatured, optional: featuredPosition, featuredUntil
 */
router.put("/admin/:id/featured", RaffleController.toggleFeaturedStatus);

/**
 * Suspend or resume a raffle
 * Admins can temporarily suspend raffles
 * Requires: suspend (boolean)
 */
router.put("/admin/:id/suspend", RaffleController.toggleSuspendStatus);

module.exports = router;