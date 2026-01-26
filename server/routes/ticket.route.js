const express = require("express");
const TicketController = require("../controllers/ticket.controller");
const router = express.Router();
const auth = require("../config/auth");

router.post("/buy", auth.bearer, TicketController.buyTicket);
router.post("/store-signature", auth.bearer, TicketController.storeSignature);
router.post("/cancel-reservation", auth.bearer, TicketController.cancelReservation);
router.get("/reservation-status/:reservationId", auth.bearer, TicketController.getReservationStatus);
router.get("/available-tickets/:raffleId", TicketController.getAvailableTickets);

router.get("/user-tickets", auth.bearer, TicketController.getUserTickets);

module.exports = router;
