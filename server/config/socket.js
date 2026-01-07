const logger = require("../util/logger");

module.exports = (io) => {
  // Store connected users and their rooms
  const connectedUsers = new Map();
  const raffleRooms = new Map(); // raffleId -> Set of socketIds

  logger.info("🔌 Socket.IO server initialized");

  io.on("connection", (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id}`);

    // Handle user joining
    socket.on("join", (data) => {
      const { userId, userPubkey } = data;
      
      connectedUsers.set(socket.id, {
        userId,
        userPubkey,
        joinedAt: new Date(),
      });

      socket.emit("joined", {
        success: true,
        message: "Connected to real-time updates",
      });

      logger.info(`🔌 User joined: ${userPubkey} (${socket.id})`);
    });

    // Handle joining raffle room for live updates
    socket.on("join-raffle", (data) => {
      const { raffleId } = data;
      const roomName = `raffle-${raffleId}`;
      
      socket.join(roomName);
      
      // Track raffle room membership
      if (!raffleRooms.has(raffleId)) {
        raffleRooms.set(raffleId, new Set());
      }
      raffleRooms.get(raffleId).add(socket.id);

      socket.emit("raffle-joined", {
        success: true,
        raffleId,
        message: `Joined raffle ${raffleId} for live updates`,
      });

      const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
      logger.info(`🔌 Socket ${socket.id} joined raffle room: ${roomName} (${roomSize} total clients)`);
    });

    // Handle leaving raffle room
    socket.on("leave-raffle", (data) => {
      const { raffleId } = data;
      const roomName = `raffle-${raffleId}`;
      
      socket.leave(roomName);
      
      // Remove from raffle room tracking
      if (raffleRooms.has(raffleId)) {
        raffleRooms.get(raffleId).delete(socket.id);
        if (raffleRooms.get(raffleId).size === 0) {
          raffleRooms.delete(raffleId);
        }
      }

      logger.info(`Socket ${socket.id} left raffle room: ${roomName}`);
    });

    // Handle joining profile room for payout updates
    socket.on("join-profile", (data) => {
      const { userId } = data;
      const roomName = `profile-${userId}`;
      
      socket.join(roomName);
      
      socket.emit("profile-joined", {
        success: true,
        userId,
        message: `Joined profile updates for user ${userId}`,
      });

      logger.info(`Socket ${socket.id} joined profile room: ${roomName}`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      // Clean up user data
      connectedUsers.delete(socket.id);
      
      // Clean up raffle room memberships
      for (const [raffleId, socketIds] of raffleRooms.entries()) {
        socketIds.delete(socket.id);
        if (socketIds.size === 0) {
          raffleRooms.delete(raffleId);
        }
      }

      logger.info(`Socket disconnected: ${socket.id}`);
    });

    // Handle ping for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // Handle test events from client
    socket.on("test-from-client", (data) => {
      logger.info(`🔌 Received test event from client ${socket.id}:`, data);
      socket.emit("test-response", { 
        message: "Test received by server", 
        originalData: data,
        timestamp: Date.now() 
      });
    });
  });

  // Export socket instance for use in other modules
  global.socketIO = io;
  
  return io;
};