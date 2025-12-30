import { ReactNode } from 'react';
import { useWalletChangeDetection } from '../hooks/useWalletChangeDetection';

interface WalletWrapperProps {
  children: ReactNode;
}

const WalletWrapper = ({ children }: WalletWrapperProps) => {
  // Initialize wallet change detection inside wallet context
  useWalletChangeDetection();
  
  return <>{children}</>;
};

export default WalletWrapper;