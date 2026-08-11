const gatewayPattern = /^https:\/\/(?:arweave\.net|gateway\.irys\.xyz|uploader\.irys\.xyz|ipfs\.io|gateway\.pinata\.cloud|gateway\.pinit\.io)\//i;

export function getAssetUrl(value: string) {
  const uri = value.trim();

  if (uri.startsWith("ipfs://") || gatewayPattern.test(uri)) {
    return `/api/assets/proxy?uri=${encodeURIComponent(uri)}`;
  }

  return uri;
}
