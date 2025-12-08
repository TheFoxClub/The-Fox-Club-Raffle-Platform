const express = require("express");
const TicketController = require("../controllers/ticket.controller");
const router = express.Router();
const auth = require("../config/auth");

router.post("/buy", auth.bearer, TicketController.buyTicket);
router.post("/store-signature", auth.bearer, TicketController.storeSignature);

module.exports = router;
