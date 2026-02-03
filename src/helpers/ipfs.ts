const TOKEN_PLACEHOLDER = "/upload/token-placeholder.png";

export const normalizeIpfs = (uri?: string | null) => {
  if (!uri) return TOKEN_PLACEHOLDER;

  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.solfundly.com/ipfs/");
  }

  if (uri.startsWith("http")) {
    return uri;
  }

  return TOKEN_PLACEHOLDER;
};
