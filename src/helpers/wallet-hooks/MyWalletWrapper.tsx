import React from "react";
import { useSelector } from "react-redux";
import SolanaWalletWrapper from "../solana-helpers/SolanaWalletWrapper";
import type { BlockchainNetwork } from "../hashlips-generator/type";
import type { RootState } from "../../redux/store";

interface MyWalletWrapperProps {
  children: React.ReactNode;
  autoConnect: boolean;
}

const MyWalletWrapper: React.FC<MyWalletWrapperProps> = ({
  children,
  autoConnect,
}) => {
  const blockchainNetwork = useSelector(
    (state: RootState) => state.blockchainNetwork as BlockchainNetwork
  );

  switch (blockchainNetwork) {
    case "solana":
      return (
        <SolanaWalletWrapper autoConnect={autoConnect}>
          {children}
        </SolanaWalletWrapper>
      );
    default:
      return (
        <SolanaWalletWrapper autoConnect={autoConnect}>
          {children}
        </SolanaWalletWrapper>
      );
  }
};

export default MyWalletWrapper;
