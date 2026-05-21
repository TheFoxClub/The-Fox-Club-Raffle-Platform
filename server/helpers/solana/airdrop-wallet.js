const { Keypair } = require("@solana/web3.js");
const { getConnectionDas } = require("../../config/solana");
const {
  createSignerFromKeypair,
  keypairIdentity,
} = require("@metaplex-foundation/umi");
const {
  fromWeb3JsKeypair,
} = require("@metaplex-foundation/umi-web3js-adapters");
const logger = require("../../util/logger");

const AIRDROP_WALLET_KEY = "AIRDROP_WALLET_SECRET_KEY";

const loadAirdropWalletKeypair = () => {
  const rawValue = process.env[AIRDROP_WALLET_KEY];

  if (!rawValue) {
    throw new Error(
      `Airdrop wallet is not configured. Set ${AIRDROP_WALLET_KEY} in the environment.`,
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
      `Invalid ${AIRDROP_WALLET_KEY}. Expected a JSON array of secret key bytes.`,
    );
  }
};

class AirdropWallet {
  static #instance;
  static #serializedKeypair;
  #wallet;
  #connection;

  constructor(airdropWalletKeypair) {
    this.#wallet = Keypair.fromSecretKey(new Uint8Array(airdropWalletKeypair));
    this.#connection = getConnectionDas();

    logger.info(`AirdropWallet initialized: ${this.#wallet.publicKey.toString()}`);
  }

  /**
   * Get singleton instance of AirdropWallet
   * @returns {AirdropWallet} Singleton instance
   */
  static getInstance() {
    const airdropWalletKeypair = loadAirdropWalletKeypair();
    const serializedKeypair = JSON.stringify(airdropWalletKeypair);

    if (!AirdropWallet.#instance || AirdropWallet.#serializedKeypair !== serializedKeypair) {
      AirdropWallet.#instance = new AirdropWallet(airdropWalletKeypair);
      AirdropWallet.#serializedKeypair = serializedKeypair;
    }

    return AirdropWallet.#instance;
  }

  /**
   * Sign a transaction with the airdrop wallet
   * @param {Transaction} transaction - Transaction to sign
   * @returns {Transaction} Signed transaction
   */
  signTransaction = (transaction) => {
    transaction.sign(this.#wallet);
    return transaction;
  };

  /**
   * Partially sign a transaction (for multi-sig scenarios)
   * @param {Transaction} transaction - Transaction to partially sign
   * @returns {Transaction} Partially signed transaction
   */
  partialSign = (transaction) => {
    transaction.partialSign(this.#wallet);
    return transaction;
  };

  /**
   * Get UMI instance with airdrop wallet as signer
   * @param {Umi} umi - UMI instance
   * @returns {Umi} UMI with airdrop wallet identity
   */
  getUmiWithSigner = (umi) => {
    if (!umi) throw new Error("Umi is required");

    const umiKeypair = fromWeb3JsKeypair(this.#wallet);
    umi.use(keypairIdentity(umiKeypair));

    return umi;
  };

  /**
   * Sign a transaction using UMI
   * @param {Transaction} transaction - Transaction to sign
   * @param {Umi} umi - UMI instance
   * @returns {Promise<Transaction>} Signed transaction
   */
  signWithUmi = async (transaction, umi) => {
    if (!transaction) throw new Error("Transaction is required");
    if (!umi) throw new Error("Umi is required");

    const signer = createSignerFromKeypair(umi, this.#wallet);
    transaction = await signer.signTransaction(transaction);

    return transaction;
  };

  /**
   * Send a raw transaction to the network
   * @param {Transaction} transaction - Serialized transaction
   * @returns {Promise<string>} Transaction signature
   */
  sendRawTransaction = async (transaction) => {
    return this.#connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
    });
  };

  /**
   * Get the airdrop wallet's public key
   * @returns {PublicKey} Wallet public key
   */
  getWalletPubkey = () => {
    return this.#wallet.publicKey;
  };

  /**
   * Get the airdrop wallet address as base58 string
   * @returns {string} Wallet address
   */
  getWalletAddress = () => {
    return this.#wallet.publicKey.toString();
  };
}

module.exports.AirdropWallet = {
  signTransaction: (transaction) => AirdropWallet.getInstance().signTransaction(transaction),
  partialSign: (transaction) => AirdropWallet.getInstance().partialSign(transaction),
  getUmiWithSigner: (umi) => AirdropWallet.getInstance().getUmiWithSigner(umi),
  signWithUmi: (transaction, umi) => AirdropWallet.getInstance().signWithUmi(transaction, umi),
  sendRawTransaction: (transaction) => AirdropWallet.getInstance().sendRawTransaction(transaction),
  getWalletPubkey: () => AirdropWallet.getInstance().getWalletPubkey(),
  getWalletAddress: () => AirdropWallet.getInstance().getWalletAddress(),
};
