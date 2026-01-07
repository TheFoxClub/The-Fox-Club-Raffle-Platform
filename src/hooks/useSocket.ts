import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import socketService from "../services/socket.service";

export const useSocket = () => {
  const user = useSelector((state: any) => state.user);
  const isInitialized = useRef(false);

  useEffect(() => {
    console.log("🔌 useSocket effect - user state:", {
      isAuthenticated: user.isAuthenticated,
      id: user.id,
      pubkey: user.pubkey,
      isInitialized: isInitialized.current,
    });

    // Always try to connect, even if user is not logged in (for debugging)
    if (!isInitialized.current) {
      console.log("🔌 Initializing Socket.IO connection...");
      socketService.connect(user.id, user.pubkey);

      if (user.isAuthenticated && user.id) {
        socketService.joinProfile(user.id);
      }

      isInitialized.current = true;
    }

    // Disconnect when user logs out
    if (!user.isAuthenticated && isInitialized.current && user.id) {
      console.log("🔌 Disconnecting Socket.IO - user logged out");
      socketService.disconnect();
      isInitialized.current = false;
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount in development for debugging
      // if (process.env.NODE_ENV !== 'development') {
      if (import.meta.env.VITE_MODE !== "development") {
        if (isInitialized.current) {
          socketService.disconnect();
          isInitialized.current = false;
        }
      }
    };
  }, [user.isAuthenticated, user.id, user.pubkey]);

  return {
    socket: socketService.getSocket(),
    isConnected: socketService.isSocketConnected(),
    joinRaffle: socketService.joinRaffle.bind(socketService),
    leaveRaffle: socketService.leaveRaffle.bind(socketService),
    joinProfile: socketService.joinProfile.bind(socketService),
  };
};

export default useSocket;
