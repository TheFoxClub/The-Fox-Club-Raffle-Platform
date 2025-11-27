const { status: httpStatus } = require("http-status");
const logger = require("../util/logger");
const respond = require("../util/respond");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { dasApi } = require("@metaplex-foundation/digital-asset-standard-api");
const { publicKey } = require("@metaplex-foundation/umi");
const {
  COLLECTION_ADDRESS,
  SOLANA_RPC_POOL_DAS_API,
} = require("../config/credentials");

const umi = createUmi(SOLANA_RPC_POOL_DAS_API).use(dasApi());

class HolderController {
  static async getUserNftsFromCollection(req, res) {
    try {
      const { pubkey } = req.params;

      if (!pubkey) {
        return respond(res, httpStatus.BAD_REQUEST, "Missing wallet address");
      }

      const searchParams = {
        owner: publicKey(pubkey),
      };

      const collection = COLLECTION_ADDRESS;
      if (collection) {
        searchParams.grouping = ["collection", collection];
      }

      const result = await umi.rpc.searchAssets(searchParams);

      const nfts = result.items.map((item) => ({
        mint: item.id,
        name: item.content?.metadata?.name,
        uri: item.content?.json_uri,
        interface: item.interface,
        grouping: item.grouping,
        ownership: item.ownership,
      }));

      return respond(res, httpStatus.OK, "NFTs fetched successfully!", {
        total: result.total,
        nfts,
      });
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to fetch NFTs.",
        {
          error: err.message,
        }
      );
    }
  }

  static async getUserNfts(req, res) {
    try {
      const { pubkey } = req.params;

      if (!pubkey) {
        return respond(res, httpStatus.BAD_REQUEST, "Missing wallet address");
      }

      const searchParams = {
        owner: publicKey(pubkey),
      };

      const result = await umi.rpc.searchAssets(searchParams);

      const nfts = result.items.map((item) => ({
        mint: item.id,
        name: item.content?.metadata?.name,
        uri: item.content?.json_uri,
        interface: item.interface,
        grouping: item.grouping,
        ownership: item.ownership,
      }));

      return respond(res, httpStatus.OK, "NFTs fetched successfully!", {
        total: result.total,
        nfts,
      });
    } catch (err) {
      logger.error(err);
      return respond(
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to fetch NFTs.",
        {
          error: err.message,
        }
      );
    }
  }
}

module.exports = HolderController;
