import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { ConnectionContextState, useConnection } from "@solana/wallet-adapter-react";
import { BlockchainNetwork } from "../hashlips-generator/type";

const useMyConnection = (): ConnectionContextState => {
  const blockchainNetwork = useSelector((state: RootState) => state.blockchainNetwork as BlockchainNetwork);

  switch (blockchainNetwork) {
    case "solana":
      return useConnection();
    default:
      return useConnection();
  }
};

export default useMyConnection;
