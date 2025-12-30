import { useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDispatch } from 'react-redux';
import { logout } from '../redux/userSlice';
import { toast } from 'react-toastify';
import server from '../config/server';

export const useWalletChangeDetection = () => {
  const { publicKey, connected } = useWallet();
  const dispatch = useDispatch();
  const previousPublicKey = useRef<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const currentPublicKey = publicKey?.toString() || null;

    // Skip the first render to avoid false positives
    if (!isInitialized.current) {
      previousPublicKey.current = currentPublicKey;
      isInitialized.current = true;
      return;
    }

    // If wallet was connected and now disconnected, logout
    if (previousPublicKey.current && !connected) {
      handleLogout('Wallet disconnected. You have been logged out.');
      previousPublicKey.current = null;
      return;
    }

    // If wallet address changed while connected, logout
    if (
      previousPublicKey.current && 
      currentPublicKey && 
      previousPublicKey.current !== currentPublicKey
    ) {
      handleLogout('Wallet address changed. You have been logged out for security.');
      previousPublicKey.current = currentPublicKey;
      return;
    }

    // Update the reference for next comparison
    previousPublicKey.current = currentPublicKey;
  }, [publicKey, connected, dispatch]);

  const handleLogout = async (message: string) => {
    try {
      // Call server logout endpoint to clear server-side session
      await server.post('/auth/logout');
    } catch (error) {
      console.warn('Failed to logout from server:', error);
    } finally {
      // Always clear client-side state
      dispatch(logout());
      toast.info(message);
    }
  };
};