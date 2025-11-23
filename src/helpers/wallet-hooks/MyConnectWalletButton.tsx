import React from "react";
import SolanaConnectWallet from "../solana-helpers/SolanaConnectWallet";
import { WalletMultiButton } from "../../components/reusable/WalletMultiButton";

interface MyConnectWalletButtonProps {
  className?: string;
  disabled?: boolean;
  disableMenu?: boolean;
  children?: React.ReactNode;
}

const MyConnectWalletButton: React.FC<MyConnectWalletButtonProps> = ({
  className,
  disabled,
  disableMenu = false,
  children,
}) => {
  if (children) {
    return (
      <WalletMultiButton disabled={disabled} disableMenu={disableMenu}>
        {children}
      </WalletMultiButton>
    );
  }

  return <SolanaConnectWallet disabled={disabled} className={className} />;
};

export default MyConnectWalletButton;
