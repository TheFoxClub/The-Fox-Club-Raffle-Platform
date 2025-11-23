import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import SolanaSignIn from "./SolanaSignIn";
interface SolanaConnectWalletProps {
  className?: string;
  disabled: boolean;
}

const SolanaConnectWallet: React.FC<SolanaConnectWalletProps> = ({
  className,
  disabled,
}) => {
  const { connected } = useWallet();
  return (
    <div className="d-flex justify-content-center">
      {/* {connected && <SolanaSignIn />} */}
      <WalletMultiButton className={className} disabled={disabled} />
    </div>
  );
};

export default SolanaConnectWallet;
