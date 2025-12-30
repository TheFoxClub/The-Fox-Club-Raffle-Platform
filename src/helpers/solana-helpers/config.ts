import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { Connection, clusterApiUrl } from "@solana/web3.js";

export const SOLANA_NETWORK: WalletAdapterNetwork = (import.meta.env.VITE_SOLANA_NETWORK ||
  WalletAdapterNetwork.Devnet) as WalletAdapterNetwork;
export const SOLANA_RPC_HOST = import.meta.env.VITE_SOLANA_RPC_HOST || clusterApiUrl(SOLANA_NETWORK);
// export const SOLANA_NETWORK: WalletAdapterNetwork = WalletAdapterNetwork.Devnet as WalletAdapterNetwork;
// export const SOLANA_RPC_HOST = clusterApiUrl(SOLANA_NETWORK);

const connectionRpc = new Connection(SOLANA_RPC_HOST);

export const getConnection = () => connectionRpc;
