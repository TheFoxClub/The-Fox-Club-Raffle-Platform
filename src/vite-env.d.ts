/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODE: string
  readonly VITE_BASE_API_URL: string
  readonly VITE_CLIENT_URL: string
  readonly VITE_SOLANA_RPC_HOST: string
  readonly VITE_SOLANA_NETWORK: string
  readonly VITE_SOLANA_RPC_POOL_DAS_API: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}