import { useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/userSlice';
import { toast } from 'react-toastify';
import server from '../config/server';
import type { RootState } from '../redux/store';

export const useWalletChangeDetection = () => {
  const { publicKey, connected } = useWallet();
  const dispatch = useDispatch();
  const authenticatedPubkey = useSelector(
    (state: RootState) => state.user.pubkey,
  );
  const isAuthenticated = useSelector(
    (state: RootState) => state.user.isAuthenticated,
  );
  const previousPublicKey = useRef<string | null>(null);
  const isInitialized = useRef(false);
  const isLoggingOut = useRef(false);

  useEffect(() => {
    const currentPublicKey = publicKey?.toString() || null;

    // On refresh, the previous wallet address is unavailable. Compare the
    // authenticated session with the wallet restored by Phantom instead.
    if (
      isAuthenticated &&
      authenticatedPubkey &&
      connected &&
      currentPublicKey &&
      authenticatedPubkey !== currentPublicKey
    ) {
      handleLogout('Wallet address changed. You have been logged out for security.');
      return;
    }

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
  }, [publicKey, connected, authenticatedPubkey, isAuthenticated, dispatch]);

  const handleLogout = async (message: string) => {
    if (isLoggingOut.current) {
      return;
    }

    isLoggingOut.current = true;
    try {
      // Call server logout endpoint to clear server-side session
      await server.post('/auth/logout');
    } catch (error) {
      console.warn('Failed to logout from server:', error);
    } finally {
      // Always clear client-side state
      dispatch(logout());
      toast.info(message);
      window.location.assign('/');
    }
  };
};