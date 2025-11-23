const { Keypair } = require("@solana/web3.js");
const walletKeypair = require("./wallet.json");
const { getConnectionDas } = require("../../config/solana");
const {
  createSignerFromKeypair,
  keypairIdentity,
} = require("@metaplex-foundation/umi");
const {
  fromWeb3JsKeypair,
} = require("@metaplex-foundation/umi-web3js-adapters");

class Wallet {
  static #instance;
  #wallet;
  #connection;

  constructor() {
    this.#wallet = Keypair.fromSecretKey(new Uint8Array(walletKeypair));
    this.#connection = getConnectionDas();
  }

  // Public method to get the instance or create one if it doesn't exist
  static getInstance() {
    if (!Wallet.#instance) {
      Wallet.#instance = new Wallet(walletKeypair);
    } else if (
      walletKeypair !== Wallet.#instance.#wallet.publicKey.toString()
    ) {
      // Check for keypair change
      Wallet.#instance = new Wallet(walletKeypair);
    }

    return Wallet.#instance;
  }

  signTransaction = (transaction) => {
    transaction.sign(this.#wallet);

    return transaction;
  };

  partialSign = (transaction) => {
    transaction.partialSign(this.#wallet);
    return transaction;
  };

  getUmiWithSigner = (umi) => {
    if (!umi) throw new Error("Umi is required");

    const umiKeypair = fromWeb3JsKeypair(this.#wallet);
    umi.use(keypairIdentity(umiKeypair));

    return umi;
  };

  signWithUmi = async (transaction, umi) => {
    if (!transaction) throw new Error("Transaction is required");
    if (!umi) throw new Error("Transaction is required");

    const signer = createSignerFromKeypair(umi, this.#wallet);

    transaction = await signer.signTransaction(transaction);

    return transaction;
  };

  sendRawTransaction = async (transaction) => {
    return this.#connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
    });
  };

  getWalletPubkey = () => {
    return this.#wallet.publicKey;
  };
}

module.exports.Wallet = Wallet.getInstance();
