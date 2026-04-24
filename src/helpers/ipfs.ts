export const normalizeIpfs = (uri?: string | null): string | null => {
  if (!uri) return null;

  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }

  return uri;
};
