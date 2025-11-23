import React from "react";
import SolanaConnectWallet from "../solana-helpers/SolanaConnectWallet";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface MyConnectWalletButtonProps {
  className?: string;
  disabled?: boolean;
  children?: any;
}

const MyConnectWalletButton: React.FC<MyConnectWalletButtonProps> = ({
  className,
  disabled,
  children,
}) => {
  if (children) {
    return (
      <WalletMultiButton disabled={disabled}>{children}</WalletMultiButton>
    );
  }

  return <SolanaConnectWallet disabled={disabled} className={className} />;
};

export default MyConnectWalletButton;
