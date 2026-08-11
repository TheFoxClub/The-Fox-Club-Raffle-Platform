const express = require("express");

const router = express.Router();
const FETCH_TIMEOUT_MS = 10_000;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://ipfs.io/ipfs",
  "https://gateway.pinit.io/ipfs",
];
const ALLOWED_HOSTS = new Set([
  "arweave.net",
  "gateway.irys.xyz",
  "uploader.irys.xyz",
  "ipfs.io",
  "gateway.pinata.cloud",
  "gateway.pinit.io",
]);

function getCandidates(uri) {
  if (uri.startsWith("ipfs://")) {
    const path = uri.slice("ipfs://".length).replace(/^ipfs\//, "").replace(/^\/+/, "");
    return path ? IPFS_GATEWAYS.map((gateway) => `${gateway}/${path}`) : [];
  }

  try {
    const url = new URL(uri);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname) ? [url.toString()] : [];
  } catch {
    return [];
  }
}

async function fetchAsset(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/proxy", async (req, res) => {
  const uri = typeof req.query.uri === "string" ? req.query.uri.trim() : "";
  const candidates = getCandidates(uri);

  if (!candidates.length) {
    return res.status(400).json({ error: "Only IPFS, Arweave, and Irys assets are supported." });
  }

  for (const candidate of candidates) {
    try {
      const response = await fetchAsset(candidate);
      const contentLength = Number(response.headers.get("content-length") || 0);

      if (!response.ok || contentLength > MAX_ASSET_BYTES) {
        continue;
      }

      const body = Buffer.from(await response.arrayBuffer());
      if (body.length > MAX_ASSET_BYTES) {
        continue;
      }

      res.set({
        "Content-Type": response.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      });
      return res.send(body);
    } catch {
      continue;
    }
  }

  return res.status(504).json({ error: "Unable to load asset from its gateway." });
});

module.exports = router;
