const { Connection } = require("@solana/web3.js");
const { SOLANA_RPC_HOST, SOLANA_RPC_POOL_DAS_API } = require("./credentials");
const { dasApi } = require("@metaplex-foundation/digital-asset-standard-api");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { Metaplex, ReadApiConnection } = require("@metaplex-foundation/js");

const rpcHost = SOLANA_RPC_HOST || "https://api.devnet.solana.org";
const rpcDasApi = SOLANA_RPC_POOL_DAS_API || "https://api.devnet.solana.org";

const connectionRpc = new Connection(rpcHost);
const connectionDas = new Connection(rpcDasApi);

let umiInstance = null;
const getUmi = () => {
  if (!umiInstance) {
    umiInstance = createUmi(connectionDas).use(dasApi());
  }
  return umiInstance;
};

const metaplex = new Metaplex(connectionDas);

let readApiConnection = null;
const getConnectionReadApi = () => {
  if (!readApiConnection) {
    readApiConnection = new ReadApiConnection(getUmi().rpc.getEndpoint());
  }
  return readApiConnection;
};

module.exports.getConnection = () => connectionRpc;
module.exports.getConnectionDas = () => connectionDas;
module.exports.getUmi = getUmi;
module.exports.getConnectionReadApi = getConnectionReadApi;
module.exports.metaplex = () => metaplex;
