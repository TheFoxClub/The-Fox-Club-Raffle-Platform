const { Keypair } = require("@solana/web3.js");
const { getConnectionDas } = require("../../config/solana");
const {
  createSignerFromKeypair,
  keypairIdentity,
} = require("@metaplex-foundation/umi");
const {
  fromWeb3JsKeypair,
} = require("@metaplex-foundation/umi-web3js-adapters");

const PLATFORM_WALLET_KEY = "PLATFORM_WALLET_SECRET_KEY";

const loadWalletKeypair = () => {
  const rawValue = process.env[PLATFORM_WALLET_KEY];

  if (!rawValue) {
    throw new Error(
      `Platform wallet is not configured. Set ${PLATFORM_WALLET_KEY} in the environment.`,
    );
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
      throw new Error("Wallet secret key must be a non-empty JSON array");
    }

    return parsedValue;
  } catch (error) {
    throw new Error(
      `Invalid ${PLATFORM_WALLET_KEY}. Expected a JSON array of secret key bytes.`,
    );
  }
};

class Wallet {
  static #instance;
  static #serializedKeypair;
  #wallet;
  #connection;

  constructor(walletKeypair) {
    this.#wallet = Keypair.fromSecretKey(new Uint8Array(walletKeypair));
    this.#connection = getConnectionDas();
  }

  // Public method to get the instance or create one if it doesn't exist
  static getInstance() {
    const walletKeypair = loadWalletKeypair();
    const serializedKeypair = JSON.stringify(walletKeypair);

    if (!Wallet.#instance || Wallet.#serializedKeypair !== serializedKeypair) {
      Wallet.#instance = new Wallet(walletKeypair);
      Wallet.#serializedKeypair = serializedKeypair;
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

  getSignerKeypair = () => {
    return this.#wallet;
  };
}

module.exports.Wallet = {
  signTransaction: (transaction) => Wallet.getInstance().signTransaction(transaction),
  partialSign: (transaction) => Wallet.getInstance().partialSign(transaction),
  getUmiWithSigner: (umi) => Wallet.getInstance().getUmiWithSigner(umi),
  signWithUmi: (transaction, umi) => Wallet.getInstance().signWithUmi(transaction, umi),
  sendRawTransaction: (transaction) => Wallet.getInstance().sendRawTransaction(transaction),
  getWalletPubkey: () => Wallet.getInstance().getWalletPubkey(),
  getSignerKeypair: () => Wallet.getInstance().getSignerKeypair(),
};
