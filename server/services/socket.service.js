const logger = require("../util/logger");

class SocketService {
  static getIO() {
    if (!global.socketIO) {
      logger.warn("Socket.IO instance not available - events will not be emitted");
      return null;
    }
    return global.socketIO;
  }

  // Raffle-related events
  static emitRaffleUpdate(raffleId, data) {
    const io = this.getIO();
    if (io) {
      const roomName = `raffle-${raffleId}`;
      const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
      
      logger.info(`Emitting raffle update to room ${roomName} (${roomSize} clients)`);
      
      io.to(roomName).emit("raffle-updated", {
        raffleId,
        ...data,
        timestamp: Date.now(),
      });
      
      logger.info(`Emitted raffle update for raffle ${raffleId} to ${roomSize} clients`);
    } else {
      logger.error("Cannot emit raffle update - Socket.IO not available");
    }
  }

  static emitTicketPurchase(raffleId, data) {
    logger.info(`🔌 emitTicketPurchase called for raffle ${raffleId} with data:`, data);
    
    const io = this.getIO();
    if (io) {
      const roomName = `raffle-${raffleId}`;
      const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
      
      logger.info(`🔌 Emitting ticket purchase to room ${roomName} (${roomSize} clients)`);
      
      io.to(roomName).emit("ticket-purchased", {
        raffleId,
        ...data,
        timestamp: Date.now(),
      });
      
      logger.info(`🔌 Emitted ticket purchase for raffle ${raffleId} to ${roomSize} clients`);
    } else {
      logger.error("🔌 Cannot emit ticket purchase - Socket.IO not available");
    }
  }

  static emitRaffleEnded(raffleId, data) {
    const io = this.getIO();
    if (io) {
      io.to(`raffle-${raffleId}`).emit("raffle-ended", {
        raffleId,
        ...data,
        timestamp: Date.now(),
      });
      logger.info(`Emitted raffle ended for raffle ${raffleId}`);
    }
  }

  static emitWinnersSelected(raffleId, data) {
    const io = this.getIO();
    if (io) {
      io.to(`raffle-${raffleId}`).emit("winners-selected", {
        raffleId,
        ...data,
        timestamp: Date.now(),
      });
      logger.info(`Emitted winners selected for raffle ${raffleId}`);
    }
  }

  // Transaction-related events
  static emitTransactionUpdate(userId, data) {
    const io = this.getIO();
    if (io) {
      io.to(`profile-${userId}`).emit("transaction-updated", {
        userId,
        ...data,
        timestamp: Date.now(),
      });
      logger.info(`Emitted transaction update for user ${userId}`);
    }
  }

  static emitPayoutUpdate(userId, data) {
    const io = this.getIO();
    if (io) {
      io.to(`profile-${userId}`).emit("payout-updated", {
        userId,
        ...data,
        timestamp: Date.now(),
      });
      logger.info(`Emitted payout update for user ${userId}`);
    }
  }

  static emitRewardClaimUpdate(userId, data) {
    const io = this.getIO();
    if (io) {
      io.to(`profile-${userId}`).emit("reward-claim-updated", {
        userId,
        ...data,
        timestamp: Date.now(),
      });
      logger.info(`Emitted reward claim update for user ${userId}`);
    }
  }

  // Global events
  static emitGlobalUpdate(event, data) {
    const io = this.getIO();
    if (io) {
      io.emit(event, {
        ...data,
        timestamp: Date.now(),
      });
      logger.info(`Emitted global event: ${event}`);
    }
  }

  // Raffle status changes
  static emitRaffleStatusChange(raffleId, oldStatus, newStatus, data = {}) {
    const io = this.getIO();
    if (io) {
      const eventData = {
        raffleId,
        oldStatus,
        newStatus,
        ...data,
        timestamp: Date.now(),
      };

      // Emit to raffle room
      io.to(`raffle-${raffleId}`).emit("raffle-status-changed", eventData);
      
      // Also emit globally for raffle lists
      io.emit("raffle-list-updated", eventData);
      
      logger.info(`Emitted raffle status change for raffle ${raffleId}: ${oldStatus} -> ${newStatus}`);
    }
  }

  // Utility methods
  static getRoomSize(roomName) {
    const io = this.getIO();
    if (io && io.sockets.adapter.rooms.has(roomName)) {
      return io.sockets.adapter.rooms.get(roomName).size;
    }
    return 0;
  }

  static getConnectedUsersCount() {
    const io = this.getIO();
    return io ? io.engine.clientsCount : 0;
  }
}

module.exports = SocketService;