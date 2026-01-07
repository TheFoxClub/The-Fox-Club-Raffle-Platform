import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(userId?: number, userPubkey?: string) {
    if (this.socket?.connected) {
      console.log("🔌 Socket already connected:", this.socket.id);
      return this.socket;
    }

    // Get the server URL for Socket.IO (should be the base server URL without /api)
    const baseApiUrl =
      import.meta.env.VITE_BASE_API_URL || "http://localhost:8080/api";
    const serverUrl = baseApiUrl.replace("/api", "");

    console.log("🔌 Connecting to Socket.IO server:", serverUrl);
    console.log("🔌 Environment variables:", {
      VITE_BASE_API_URL: import.meta.env.VITE_BASE_API_URL,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      calculated_serverUrl: serverUrl,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE,
    });

    try {
      this.socket = io(serverUrl, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true, // Force a new connection
      });

      console.log("🔌 Socket.IO client created, setting up event listeners...");
      this.setupEventListeners();

      // Join with user info if provided
      if (userId && userPubkey) {
        console.log("🔌 Will join with user info after connection:", {
          userId,
          userPubkey,
        });
        // Wait a bit for connection to establish
        setTimeout(() => {
          if (this.socket?.connected) {
            console.log("🔌 Emitting join event with user info:", {
              userId,
              userPubkey,
            });
            this.socket.emit("join", { userId, userPubkey });
          } else {
            console.warn(
              "🔌 Socket not connected after timeout, cannot join with user info"
            );
          }
        }, 1000);
      } else {
        console.log("🔌 No user info provided, connecting without user data");
      }

      return this.socket;
    } catch (error) {
      console.error("🔌 Failed to create Socket.IO connection:", error);
      return null;
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("🔌 Socket.IO connected:", this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket.IO disconnected:", reason);
      this.isConnected = false;

      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("🔌 Socket.IO connection error:", error);
      this.handleReconnect();
    });

    this.socket.on("joined", (data) => {
      console.log("🔌 Joined Socket.IO:", data.message);
    });

    this.socket.on("pong", (data) => {
      console.log("🔌 Socket.IO pong:", data.timestamp);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔌 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        this.socket?.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    } else {
      console.error("🔌 Max reconnection attempts reached");
    }
  }

  // Room management
  joinRaffle(raffleId: number) {
    console.log(`🔌 joinRaffle called for raffle ${raffleId}`);
    console.log(`🔌 Socket state:`, {
      socket: !!this.socket,
      connected: this.socket?.connected,
      socketId: this.socket?.id,
    });

    if (this.socket?.connected) {
      console.log(`🔌 Emitting join-raffle event for raffle ${raffleId}`);
      this.socket.emit("join-raffle", { raffleId });
      console.log(`🔌 Joined raffle room: ${raffleId}`);
    } else {
      console.warn(
        `🔌 Cannot join raffle room ${raffleId} - socket not connected`
      );
      console.warn(`🔌 Socket details:`, {
        socketExists: !!this.socket,
        socketConnected: this.socket?.connected,
        isConnectedFlag: this.isConnected,
      });
    }
  }

  leaveRaffle(raffleId: number) {
    if (this.socket?.connected) {
      this.socket.emit("leave-raffle", { raffleId });
      console.log(`🔌 Left raffle room: ${raffleId}`);
    }
  }

  joinProfile(userId: number) {
    if (this.socket?.connected) {
      this.socket.emit("join-profile", { userId });
      console.log(`🔌 Joined profile room: ${userId}`);
    } else {
      console.warn(
        `🔌 Cannot join profile room ${userId} - socket not connected`
      );
    }
  }

  // Event listeners
  onRaffleUpdate(callback: (data: any) => void) {
    console.log("🔌 Registering raffle-updated event listener");
    this.socket?.on("raffle-updated", (data) => {
      console.log("🔌 Received raffle-updated event:", data);
      callback(data);
    });
  }

  onTicketPurchase(callback: (data: any) => void) {
    console.log("🔌 Registering ticket-purchased event listener");
    this.socket?.on("ticket-purchased", (data) => {
      console.log("🔌 Received ticket-purchased event:", data);
      callback(data);
    });
  }

  onRaffleEnded(callback: (data: any) => void) {
    console.log("🔌 Registering raffle-ended event listener");
    this.socket?.on("raffle-ended", (data) => {
      console.log("🔌 Received raffle-ended event:", data);
      callback(data);
    });
  }

  onWinnersSelected(callback: (data: any) => void) {
    console.log("🔌 Registering winners-selected event listener");
    this.socket?.on("winners-selected", (data) => {
      console.log("🔌 Received winners-selected event:", data);
      callback(data);
    });
  }

  onRaffleStatusChanged(callback: (data: any) => void) {
    console.log("🔌 Registering raffle-status-changed event listener");
    this.socket?.on("raffle-status-changed", (data) => {
      console.log("🔌 Received raffle-status-changed event:", data);
      callback(data);
    });
  }

  onRaffleListUpdated(callback: (data: any) => void) {
    this.socket?.on("raffle-list-updated", callback);
  }

  onTransactionUpdate(callback: (data: any) => void) {
    this.socket?.on("transaction-updated", callback);
  }

  onPayoutUpdate(callback: (data: any) => void) {
    this.socket?.on("payout-updated", callback);
  }

  onRewardClaimUpdate(callback: (data: any) => void) {
    this.socket?.on("reward-claim-updated", callback);
  }

  // Remove event listeners
  offRaffleUpdate(callback?: (data: any) => void) {
    this.socket?.off("raffle-updated", callback);
  }

  offTicketPurchase(callback?: (data: any) => void) {
    this.socket?.off("ticket-purchased", callback);
  }

  offRaffleEnded(callback?: (data: any) => void) {
    this.socket?.off("raffle-ended", callback);
  }

  offWinnersSelected(callback?: (data: any) => void) {
    this.socket?.off("winners-selected", callback);
  }

  offRaffleStatusChanged(callback?: (data: any) => void) {
    this.socket?.off("raffle-status-changed", callback);
  }

  offRaffleListUpdated(callback?: (data: any) => void) {
    this.socket?.off("raffle-list-updated", callback);
  }

  offTransactionUpdate(callback?: (data: any) => void) {
    this.socket?.off("transaction-updated", callback);
  }

  offPayoutUpdate(callback?: (data: any) => void) {
    this.socket?.off("payout-updated", callback);
  }

  offRewardClaimUpdate(callback?: (data: any) => void) {
    this.socket?.off("reward-claim-updated", callback);
  }

  // Utility methods
  ping() {
    if (this.socket?.connected) {
      this.socket.emit("ping");
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }

  getSocket() {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Expose to window for debugging in development
// if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
if (
  typeof window !== "undefined" &&
  import.meta.env.VITE_MODE === "development"
) {
  (window as any).socketService = socketService;
}

export default socketService;
