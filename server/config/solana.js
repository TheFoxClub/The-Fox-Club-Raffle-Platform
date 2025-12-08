const { Connection } = require("@solana/web3.js");
const { SOLANA_RPC_HOST, SOLANA_RPC_POOL_DAS_API } = require("./credentials");
const { dasApi } = require("@metaplex-foundation/digital-asset-standard-api");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { Metaplex, ReadApiConnection } = require("@metaplex-foundation/js");

const connectionRpc = new Connection(SOLANA_RPC_HOST);
const connectionDas = new Connection(SOLANA_RPC_POOL_DAS_API);
const umi = createUmi(connectionDas).use(dasApi());

const metaplex = new Metaplex(connectionDas);

const getConnectionReadApi = new ReadApiConnection(umi.rpc.getEndpoint());

module.exports.getConnection = () => connectionRpc;
module.exports.getConnectionDas = () => connectionDas;
module.exports.getUmi = () => umi;
module.exports.getConnectionReadApi = () => getConnectionReadApi;
module.exports.metaplex = () => metaplex;
