import React from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SafePalWalletAdapter,
  SolflareWalletAdapter,
  SolongWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { useMemo } from "react";
import { SOLANA_RPC_HOST, SOLANA_NETWORK } from "./config";
// require("@solana/wallet-adapter-react-ui/styles.css");

interface SolanaWalletWrapperProps {
  children: React.ReactNode;
  autoConnect: boolean;
}

const SolanaWalletWrapper: React.FC<SolanaWalletWrapperProps> = ({ children, autoConnect }) => {
  const endpoint = useMemo(() => SOLANA_RPC_HOST, []);

  const wallets = useMemo(
    () => [
      new LedgerWalletAdapter(),
      new PhantomWalletAdapter(),
      new SafePalWalletAdapter(),
      new SolflareWalletAdapter({ network: SOLANA_NETWORK }),
      new SolongWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaWalletWrapper;
