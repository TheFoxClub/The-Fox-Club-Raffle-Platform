import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(userId?: number, userPubkey?: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Get the server URL for Socket.IO (should be the base server URL without /api)
    const baseApiUrl =
      import.meta.env.VITE_BASE_API_URL || "http://localhost:8080/api";
    const serverUrl = baseApiUrl.replace("/api", "");

    try {
      this.socket = io(serverUrl, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true, // Force a new connection
      });

      this.setupEventListeners();

      // Join with user info if provided
      if (userId && userPubkey) {
        // Wait a bit for connection to establish
        setTimeout(() => {
          if (this.socket?.connected) {
            this.socket.emit("join", { userId, userPubkey });
          }
        }, 1000);
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
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
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
      // console.log("🔌 Joined Socket.IO:", data.message);
    });

    this.socket.on("pong", (data) => {
      // console.log("🔌 Socket.IO pong:", data.timestamp);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      setTimeout(() => {
        this.socket?.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    }
  }

  // Room management
  joinRaffle(raffleId: number) {
    if (this.socket?.connected) {
      this.socket.emit("join-raffle", { raffleId });
    }
  }

  leaveRaffle(raffleId: number) {
    if (this.socket?.connected) {
      this.socket.emit("leave-raffle", { raffleId });
    }
  }

  joinProfile(userId: number) {
    if (this.socket?.connected) {
      this.socket.emit("join-profile", { userId });
    }
  }

  // Event listeners
  onRaffleUpdate(callback: (data: any) => void) {
    this.socket?.on("raffle-updated", callback);
  }

  onTicketPurchase(callback: (data: any) => void) {
    this.socket?.on("ticket-purchased", callback);
  }

  onRaffleEnded(callback: (data: any) => void) {
    this.socket?.on("raffle-ended", callback);
  }

  onWinnersSelected(callback: (data: any) => void) {
    this.socket?.on("winners-selected", callback);
  }

  onRaffleStatusChanged(callback: (data: any) => void) {
    this.socket?.on("raffle-status-changed", callback);
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
