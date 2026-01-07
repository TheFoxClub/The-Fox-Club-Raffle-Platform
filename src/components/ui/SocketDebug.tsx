import { useState, useEffect } from 'react';
import socketService from '../../services/socket.service';

const SocketDebug = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(socketService.isSocketConnected() || false);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    // Listen for all events
    const socket = socketService.getSocket();
    if (socket) {
      const logEvent = (eventName: string) => (data?: any) => {
        const timestamp = new Date().toLocaleTimeString();
        const dataStr = data ? JSON.stringify(data) : 'no data';
        setEvents(prev => [...prev.slice(-9), `${timestamp} - ${eventName}: ${dataStr}`]);
      };

      socket.on('connect', logEvent('connect'));
      socket.on('disconnect', logEvent('disconnect'));
      socket.on('joined', logEvent('joined'));
      socket.on('raffle-joined', logEvent('raffle-joined'));
      socket.on('ticket-purchased', logEvent('ticket-purchased'));
      socket.on('raffle-updated', logEvent('raffle-updated'));
      socket.on('test-event', logEvent('test-event'));
    }

    return () => clearInterval(interval);
  }, []);

  const testConnection = () => {
    console.log('🔌 Testing Socket.IO connection...');
    console.log('🔌 Current socket state:', {
      socket: socketService.getSocket(),
      isConnected: socketService.isSocketConnected(),
      serverUrl: (import.meta.env.VITE_BASE_API_URL || 'http://localhost:8080/api').replace('/api', '')
    });
    
    // Disconnect existing connection first
    socketService.disconnect();
    
    // Wait a bit then reconnect
    setTimeout(() => {
      console.log('🔌 Attempting new connection...');
      socketService.connect(1, 'test-user');
      
      // Check connection after a delay
      setTimeout(() => {
        console.log('🔌 Connection test result:', {
          socket: socketService.getSocket(),
          isConnected: socketService.isSocketConnected(),
          socketId: socketService.getSocket()?.id
        });
      }, 2000);
    }, 1000);
  };

  const testJoinRaffle = () => {
    console.log('🔌 Testing join raffle...');
    socketService.joinRaffle(1);
  };

  const testEmitEvent = () => {
    console.log('🔌 Testing manual event emission...');
    const socket = socketService.getSocket();
    if (socket && socket.connected) {
      console.log('🔌 Emitting test event...');
      socket.emit('test-from-client', { message: 'Hello from client', timestamp: Date.now() });
    } else {
      console.warn('🔌 Cannot emit - socket not connected');
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-4 rounded-lg max-w-md">
      <h3 className="text-sm font-bold mb-2">Socket.IO Debug</h3>
      
      <div className="mb-2">
        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      <div className="flex gap-2 mb-2">
        <button 
          onClick={testConnection}
          className="px-2 py-1 bg-blue-600 text-xs rounded"
        >
          Connect
        </button>
        <button 
          onClick={testJoinRaffle}
          className="px-2 py-1 bg-green-600 text-xs rounded"
        >
          Join Raffle 1
        </button>
        <button 
          onClick={testEmitEvent}
          className="px-2 py-1 bg-yellow-600 text-xs rounded"
        >
          Emit Test
        </button>
      </div>

      <div className="text-xs max-h-32 overflow-y-auto">
        <div className="font-semibold mb-1">Recent Events:</div>
        {events.length === 0 ? (
          <div className="text-gray-400">No events yet...</div>
        ) : (
          events.map((event, index) => (
            <div key={index} className="text-xs mb-1 break-words">
              {event}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SocketDebug;