import { WalletMultiButton } from "../../components/reusable/WalletMultiButton";
import React from "react";

interface SolanaConnectWalletProps {
  className?: string;
  disabled?: boolean;
}

const SolanaConnectWallet: React.FC<SolanaConnectWalletProps> = ({
  className,
  disabled,
}) => {
  return (
    <div className="flex justify-center">
      <WalletMultiButton className={className} disabled={disabled} />
    </div>
  );
};

export default SolanaConnectWallet;
