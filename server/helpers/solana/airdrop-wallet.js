const { Keypair } = require("@solana/web3.js");
const airdropWalletKeypair = require("./airdrop-wallet.json");
const { getConnectionDas } = require("../../config/solana");
const {
  createSignerFromKeypair,
  keypairIdentity,
} = require("@metaplex-foundation/umi");
const {
  fromWeb3JsKeypair,
} = require("@metaplex-foundation/umi-web3js-adapters");
const logger = require("../../util/logger");

const getConfiguredWalletPubkey = () => {
  const keypair = Keypair.fromSecretKey(new Uint8Array(airdropWalletKeypair));
  return keypair.publicKey.toString();
};

class AirdropWallet {
  static #instance;
  #wallet;
  #connection;

  constructor() {
    // Validate keypair before initializing
    if (!airdropWalletKeypair) {
      logger.error("Invalid airdrop wallet keypair. Please configure server/helpers/solana/airdrop-wallet.json");
      throw new Error("Invalid airdrop wallet keypair configuration");
    }

    this.#wallet = Keypair.fromSecretKey(new Uint8Array(airdropWalletKeypair));
    this.#connection = getConnectionDas();

    logger.info(`AirdropWallet initialized: ${this.#wallet.publicKey.toString()}`);
  }

  /**
   * Get singleton instance of AirdropWallet
   * @returns {AirdropWallet} Singleton instance
   */
  static getInstance() {
    if (!AirdropWallet.#instance) {
      AirdropWallet.#instance = new AirdropWallet();
    } else if (getConfiguredWalletPubkey() !== AirdropWallet.#instance.#wallet.publicKey.toString()) {
      // Check for keypair change
      logger.warn("Airdrop wallet keypair has changed. Reinitializing AirdropWallet instance.");
      AirdropWallet.#instance = new AirdropWallet();
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

module.exports.AirdropWallet = AirdropWallet.getInstance();
