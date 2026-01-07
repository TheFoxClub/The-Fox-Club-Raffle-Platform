import { useState, useEffect } from "react";
import socketService from "../../services/socket.service";

const SocketStatus = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(socketService.isSocketConnected() || false);
    };

    // Check initial state
    checkConnection();

    // Set up interval to check connection status
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isConnected) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-600 px-3 py-2 rounded-lg text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        Live Updates Active
      </div>
    </div>
  );
};

export default SocketStatus;
