import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BlockchainNetwork } from "../hashlips-generator/type";

const useMyWallet = (): {
  pubkey: string;
  connected: boolean;
} => {
  const blockchainNetwork = useSelector((state: RootState) => state.blockchainNetwork as BlockchainNetwork);

  switch (blockchainNetwork) {
    case "solana":
      const wallet = useWallet();
      const { connection } = useConnection();

      return {
        pubkey: wallet.wallet?.adapter?.publicKey?.toString() || null,
        connected: wallet.wallet?.adapter?.connected || false,
      };
    
    default:
      return null;
  }
};

export default useMyWallet;
