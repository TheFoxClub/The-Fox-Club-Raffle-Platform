const express = require("express");
const router = express.Router();
const respond = require("../util/respond");
const { status: httpStatus } = require("http-status");

// Test endpoint to check if Socket.IO is working
router.get("/test", (req, res) => {
  const io = global.socketIO;
  
  if (!io) {
    return respond(res, httpStatus.SERVICE_UNAVAILABLE, "Socket.IO not initialized", {
      socketIO: false,
      connectedClients: 0,
    });
  }

  const connectedClients = io.engine.clientsCount;
  
  return respond(res, httpStatus.OK, "Socket.IO is working", {
    socketIO: true,
    connectedClients,
    rooms: Array.from(io.sockets.adapter.rooms.keys()),
  });
});

// Test endpoint to emit a test event
router.post("/emit-test", (req, res) => {
  const io = global.socketIO;
  const { raffleId, message } = req.body;
  
  if (!io) {
    return respond(res, httpStatus.SERVICE_UNAVAILABLE, "Socket.IO not initialized");
  }

  // Emit test event to raffle room
  io.to(`raffle-${raffleId}`).emit("test-event", {
    message: message || "Test message from server",
    timestamp: Date.now(),
  });

  return respond(res, httpStatus.OK, "Test event emitted", {
    raffleId,
    message,
    roomSize: io.sockets.adapter.rooms.get(`raffle-${raffleId}`)?.size || 0,
  });
});

module.exports = router;