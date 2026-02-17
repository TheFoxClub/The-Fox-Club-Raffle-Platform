const {
  Keypair,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
  MessageV0,
  TransactionInstruction,
  TransactionMessage,
} = require("@solana/web3.js");

const {
  MPL_TOKEN_METADATA_PROGRAM_ID,
  transferV1,
  TokenStandard,
  findTokenRecordPda,
  fetchDigitalAssetWithAssociatedToken,
  fetchDigitalAsset,
  mplTokenMetadata,
} = require("@metaplex-foundation/mpl-token-metadata");

const {
  createSignerFromKeypair,
  keypairIdentity,
  publicKey,
  unwrapOptionRecursively,
  createNoopSigner,
  signerIdentity,
} = require("@metaplex-foundation/umi");

const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const {
  fromWeb3JsKeypair,
  toWeb3JsTransaction,
} = require("@metaplex-foundation/umi-web3js-adapters");

const {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");

const {
  findAssociatedTokenPda,
  createAssociatedToken,
} = require("@metaplex-foundation/mpl-toolbox");
const {
  getMplTokenAuthRulesProgramId,
} = require("@metaplex-foundation/mpl-candy-machine");

const {
  mplCore,
  fetchAsset,
  transferV1: transferCoreV1,
  collectionAddress,
} = require("@metaplex-foundation/mpl-core");

const {
  transfer: cnftTransfer,
} = require("@metaplex-foundation/mpl-bubblegum");

const wallet = require("./wallet.json");
const {
  getConnectionDas,
  getUmi,
  getConnection,
} = require("../../config/solana");
const { dasApi } = require("@metaplex-foundation/digital-asset-standard-api");
const { base64 } = require("@metaplex-foundation/umi/serializers");
const { Wallet } = require("./wallet");
const { generateChecksum } = require("./checksum-validation");
const logger = require("../../util/logger");
const { default: bs58 } = require("bs58");

const connection = getConnectionDas();
const MPL_CORE_PROGRAM_ID = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

const createAssetWithProof = (rpcAsset, rpcAssetProof) => {
  if (!rpcAsset.compression || !rpcAsset.compression.compressed) {
    throw new Error("Asset is not compressed, cannot create AssetWithProof");
  }

  return {
    // Required by Bubblegum leaf
    leafOwner: publicKey(rpcAsset.ownership.owner),
    leafDelegate: rpcAsset.ownership.delegate
      ? publicKey(rpcAsset.ownership.delegate)
      : null,
    merkleTree: publicKey(rpcAsset.compression.tree),
    root: bs58.decode(rpcAssetProof.root),
    dataHash: bs58.decode(rpcAsset.compression.data_hash),
    creatorHash: bs58.decode(rpcAsset.compression.creator_hash),
    collection_hash: rpcAsset.grouping?.find(
      (g) => g.group_key === "collection"
    )
      ? bs58.decode(
          rpcAsset.grouping.find((g) => g.group_key === "collection")
            .group_value
        )
      : undefined,
    asset_data_hash: bs58.decode(rpcAsset.compression.asset_hash),
    flags: undefined, // optional, set if needed
    nonce: rpcAsset.compression.leaf_id,
    index: rpcAsset.compression.leaf_id,
    proof: rpcAssetProof.proof.map((p) => publicKey(p)),
    metadata: rpcAsset.content.metadata, // directly map MetadataArgs
    rpcAsset,
    rpcAssetProof,
  };
};

/**
 * Handle legacy NFT transfer
 */
const handleLegacyNFT = async ({
  umi,
  transaction,
  mint,
  fromAccountAddress,
  toAccountAddress,
  direction,
}) => {
  try {
    logger.info(
      `Processing legacy NFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`
    );

    const from = new PublicKey(fromAccountAddress);
    const to = new PublicKey(toAccountAddress);

    const fromAta = await getAssociatedTokenAddress(mint, from);
    const toAta = await getAssociatedTokenAddress(mint, to);

    // Check/create destination token account
    const toAtaInfo = await connection.getAccountInfo(toAta);
    if (!toAtaInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(from, toAta, to, mint)
      );
    }

    // Add transfer instruction
    transaction.add(createTransferInstruction(fromAta, toAta, from, 1));

    let blockhashResult = await umi.rpc.getLatestBlockhash();

    let tx = umi.transactions.create({
      version: "legacy",
      blockhash: blockhashResult.blockhash,
      instructions: transaction.instructions,
      payer: publicKey(fromAccountAddress), // User is the payer, not platform
    });

    const serializedTx = umi.transactions.serialize(tx);
    const txBase64 = base64.deserialize(serializedTx)[0];

    let checksum;
    try {
      if (!tx.message || !tx.message.accounts || !tx.message.instructions) {
        logger.error(`Invalid transaction message structure:`, {
          hasMessage: !!tx.message,
          hasAccounts: !!tx.message?.accounts,
          hasInstructions: !!tx.message?.instructions,
          messageKeys: tx.message ? Object.keys(tx.message) : [],
        });
        throw new Error("Transaction message missing required fields");
      }

      checksum = generateChecksum(tx.message);
      logger.info(`Successfully generated checksum for legacy NFT`);
    } catch (checksumError) {
      logger.error(`Failed to generate checksum for legacy NFT:`, {
        error: checksumError.message,
        stack: checksumError.stack,
      });
      throw checksumError;
    }

    return {
      serializedTx: txBase64,
      checksum,
      blockhash: blockhashResult.blockhash,
      lastValidBlockHeight: blockhashResult.lastValidBlockHeight,
      type: "legacy",
      direction,
    };
  } catch (error) {
    logger.error(`Legacy NFT transfer failed:`, error);
    throw error;
  }
};

/**
 * Handle pNFT (Programmable NFT) transfer
 */
const handlePNFT = async ({
  umi,
  mint,
  toAccountAddress,
  fromAccountAddress,
  direction = "user_to_platform",
}) => {
  try {
    logger.info(
      `Processing pNFT transfer (${direction}): ${fromAccountAddress} → ${toAccountAddress}`
    );

    const umiTo = publicKey(toAccountAddress);
    const umiFrom = publicKey(fromAccountAddress);
    const mintPubkey = publicKey(mint.toBase58());

    if (direction === "platform_to_user") {
      logger.info(`Fetching pNFT asset...`);
      const asset = await fetchDigitalAssetWithAssociatedToken(
        umi,
        mintPubkey,
        umiFrom
      );
      logger.info(`Asset fetched successfully`);

      const destinationTokenAccount = findAssociatedTokenPda(umi, {
        mint: asset.mint.publicKey,
        owner: umiTo,
      });

      const destinationTokenRecord = findTokenRecordPda(umi, {
        mint: asset.mint.publicKey,
        token: destinationTokenAccount[0],
      });

      // Create noop signers for both platform and user (unsigned transaction)
      const platformNoopSigner = createNoopSigner(umiFrom);
      const userPayerSigner = createNoopSigner(umiTo);

      // Create a temporary UMI instance with noop signer for platform
      const tempUmi = createUmi(connection);
      tempUmi
        .use(signerIdentity(platformNoopSigner))
        .use(dasApi())
        .use(mplTokenMetadata())
        .use(mplCore());

      logger.info(
        `Building UNSIGNED pNFT transfer transaction for user to sign first`
      );
      logger.info(`Destination token account: ${destinationTokenAccount[0]}`);
      logger.info(`Destination token record: ${destinationTokenRecord[0]}`);

      const txBuilder = transferV1(tempUmi, {
        mint: asset.mint.publicKey,
        authority: platformNoopSigner, // Platform wallet (owns the pNFT) - noop for now
        tokenOwner: umiFrom,
        destinationOwner: umiTo,
        token: asset.token.publicKey,
        destinationToken: destinationTokenAccount[0],
        tokenRecord: asset.tokenRecord?.publicKey,
        destinationTokenRecord: destinationTokenRecord[0],
        tokenStandard: TokenStandard.ProgrammableNonFungible,
        authorizationRules:
          unwrapOptionRecursively(asset.metadata.programmableConfig)?.ruleSet ||
          undefined,
        authorizationRulesProgram: getMplTokenAuthRulesProgramId(umi),
        authorizationData: undefined,
        payer: userPayerSigner, // User pays fees
        amount: 1,
      });

      const builtTx = await txBuilder.useV0().buildWithLatestBlockhash(tempUmi);

      logger.info(
        `Transaction built with ${builtTx.message.instructions.length} instructions (UNSIGNED)`
      );

      // Generate checksum BEFORE any signatures
      const checksum = generateChecksum(builtTx.message);

      // Serialize the UNSIGNED transaction
      const serializedTx = tempUmi.transactions.serialize(builtTx);
      const serializedTxString = base64.deserialize(serializedTx)[0];

      logger.info(
        `UNSIGNED pNFT transfer transaction created for user to sign first. Checksum: ${checksum}`
      );

      return {
        serializedTx: serializedTxString,
        blockhash: builtTx.blockhash,
        lastValidBlockHeight: builtTx.lastValidBlockHeight,
        checksum,
        type: "pnft",
      };
    } else {
      // User is sending to platform - create unsigned transaction for user to sign
      const transferUmi = createUmi(connection);
      const userSigner = createNoopSigner(umiFrom);

      transferUmi
        .use(signerIdentity(userSigner))
        .use(dasApi())
        .use(mplTokenMetadata());

      logger.info(`Fetching pNFT asset...`);
      const asset = await fetchDigitalAssetWithAssociatedToken(
        transferUmi,
        mintPubkey,
        umiFrom
      );
      logger.info(`Asset fetched successfully`);

      logger.info(`Building pNFT transfer transaction...`);

      // Build the transfer - user is both authority and payer
      const txBuilder = transferV1(transferUmi, {
        mint: asset.mint.publicKey,
        authority: userSigner,
        tokenOwner: umiFrom,
        destinationOwner: umiTo,
        token: asset.token.publicKey,
        tokenRecord: asset.tokenRecord?.publicKey,
        tokenStandard: TokenStandard.ProgrammableNonFungible,
        authorizationRules:
          unwrapOptionRecursively(asset.metadata.programmableConfig)?.ruleSet ||
          undefined,
        authorizationRulesProgram: getMplTokenAuthRulesProgramId(transferUmi),
        authorizationData: undefined,
        payer: userSigner,
      });

      const builtTx = await txBuilder
        .useV0()
        .buildWithLatestBlockhash(transferUmi);

      logger.info(`Transaction built successfully`);

      // Serialize unsigned transaction for user to sign
      const serializedTx = transferUmi.transactions.serialize(builtTx);
      const serializedTxString = base64.deserialize(serializedTx)[0];

      logger.info(`pNFT transfer transaction created successfully`);
      return {
        serializedTx: serializedTxString,
        blockhash: builtTx.blockhash,
        checksum: generateChecksum(builtTx.message),
        type: "pnft",
      };
    }
  } catch (error) {
    logger.error(`Error in handlePNFT (${direction}):`, error);
    throw error;
  }
};

/**
 * Handle MPL Core NFT transfer - Build unsigned transaction for user signing
 */
const handleMPLCore = async ({
  umi,
  mint,
  toAccountAddress,
  fromAccountAddress,
  direction,
  frontEndSigner,
}) => {
  try {
    logger.info(
      `Processing MPL Core NFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`
    );

    // Use the existing UMI instance with platform signer for fetching asset data
    const coreAsset = await fetchAsset(umi, publicKey(mint.toBase58()));
    logger.info(`MPL Core asset fetched:`, {
      publicKey: coreAsset.publicKey.toString(),
      owner: coreAsset.owner?.toString(),
      updateAuthority: coreAsset.updateAuthority?.address?.toString(),
    });

    // Verify the user owns this asset
    if (coreAsset.owner?.toString() !== fromAccountAddress) {
      throw new Error(
        `Asset owner mismatch. Expected: ${fromAccountAddress}, Actual: ${coreAsset.owner?.toString()}`
      );
    }

    const collection = collectionAddress(coreAsset) || undefined;

    let builtTx;
    if (direction === "platform_to_user") {
      const platformNoopSigner = createNoopSigner(
        publicKey(fromAccountAddress)
      );
      const userPayer = createNoopSigner(publicKey(toAccountAddress));

      // Create a temporary UMI instance with noop signer for platform
      const tempUmi = createUmi(connection);
      tempUmi.use(signerIdentity(platformNoopSigner)).use(mplCore());

      logger.info(
        `Building UNSIGNED MPL Core transfer transaction for user to sign first`
      );

      builtTx = await transferCoreV1(tempUmi, {
        asset: coreAsset.publicKey,
        collection,
        authority: platformNoopSigner, // Platform wallet owns the asset - noop for now
        newOwner: publicKey(toAccountAddress), // Transfer to user wallet
        payer: userPayer, // User pays fees
      })
        .useV0()
        .buildWithLatestBlockhash(tempUmi);

      logger.info(
        `Transaction built with ${builtTx.message.instructions.length} instructions (UNSIGNED)`
      );
    } else {
      // Build transaction with a user identity to avoid extra required signers
      const userSigner = createNoopSigner(publicKey(fromAccountAddress));
      const transferUmi = createUmi(connection);

      transferUmi.use(signerIdentity(userSigner)).use(mplCore());

      builtTx = await transferCoreV1(transferUmi, {
        asset: coreAsset.publicKey,
        collection,
        newOwner: publicKey(toAccountAddress), // Transfer to platform wallet
      })
        .useV0()
        .buildWithLatestBlockhash(transferUmi);
    }

    logger.info(`Transaction signatures length: ${builtTx.signatures.length}`);
    logger.info(
      `Required signatures: ${builtTx.message.header.numRequiredSignatures}`
    );

    // Generate checksum from built transaction message
    const checksum = generateChecksum(builtTx.message);

    const serializedTx = Buffer.from(
      umi.transactions.serialize(builtTx)
    ).toString("base64");

    logger.info(
      `${
        direction === "platform_to_user" ? "UNSIGNED" : ""
      } MPL Core transaction serialized. Checksum: ${checksum}`
    );

    return {
      serializedTx: serializedTx,
      checksum,
      blockhash: builtTx.blockhash,
      lastValidBlockHeight: builtTx.lastValidBlockHeight,
      type: "mpl_core",
      direction,
    };
  } catch (error) {
    logger.error(`MPL Core NFT transfer failed:`, error);
    throw error;
  }
};

/**
 * Handle cNFT (Compressed NFT) transfer
 */
const handleCNFT = async ({
  umi,
  mint,
  toAccountAddress,
  fromAccountAddress,
  direction,
}) => {
  try {
    logger.info(
      `Processing cNFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`
    );
    const asset = await umi.rpc.getAsset(publicKey(mint));
    const assetProof = await umi.rpc.getAssetProof(publicKey(mint));
    const assetWithProof = createAssetWithProof(asset, assetProof);
    let cnftTransferBuilder = cnftTransfer(umi, {
      ...assetWithProof,
      leafOwner: createNoopSigner(publicKey(fromAccountAddress)),
      newLeafOwner: publicKey(toAccountAddress),
    });

    let builtTx;

    if (direction === "platform_to_user") {
      builtTx = await cnftTransferBuilder
        .setFeePayer(createNoopSigner(publicKey(toAccountAddress)))
        .useV0()
        .buildWithLatestBlockhash(umi);
    } else {
      builtTx = await cnftTransferBuilder
        .setFeePayer(createNoopSigner(publicKey(fromAccountAddress)))
        .useV0()
        .buildWithLatestBlockhash(umi);
    }

    const serializedWithSigs = umi.transactions.serialize(builtTx);

    const serializedTx = Buffer.from(serializedWithSigs).toString("base64");

    logger.info(`cNFT transaction created successfully`);

    return {
      serializedTx: serializedTx,
      checksum: generateChecksum(builtTx.message),
      type: "cnft",
      direction,
    };
  } catch (error) {
    logger.error(`cNFT transfer failed:`, error);
    throw error;
  }
};

/**
 * Detect NFT type automatically
 */
const detectNFTType = async (umi, mint, ownerPublicKey) => {
  const asset = await umi.rpc.getAsset(publicKey(mint.toBase58()));

  // 1. Try Core
  try {
    await fetchAsset(umi, publicKey(mint.toBase58()));
    return "core";
  } catch {}

  // 2. Try Metaplex (legacy / pNFT)
  try {
    const asset = await fetchDigitalAsset(umi, publicKey(mint.toBase58()));

    const standard = asset.metadata.tokenStandard?.value;

    if (standard === TokenStandard.ProgrammableNonFungible) {
      return "pnft";
    }

    return "legacy";
  } catch {}

  try {
    const asset = await umi.rpc.getAsset(publicKey(mint.toBase58()));

    return "cnft";
  } catch {}

  return "legacy";
};

/**
 * Main function to add NFT transfer instructions
 */
const addNftSendTransaction = async ({
  transaction,
  mintAddresses,
  toAccountAddress,
  fromAccountAddress,
  direction = "user_to_platform",
}) => {
  try {
    logger.info(`Starting NFT transfer process:`, {
      mintAddresses,
      toAccountAddress,
      fromAccountAddress,
      direction,
    });

    // Set up UMI with proper signer identity
    const from = Keypair.fromSecretKey(new Uint8Array(wallet));
    const umi = createUmi(connection);
    const umiKeypair = fromWeb3JsKeypair(from);

    umi
      .use(keypairIdentity(umiKeypair))
      .use(dasApi())
      .use(mplTokenMetadata())
      .use(mplCore());

    // Create noop signer for the user (for building unsigned transactions)
    const userSigner = createNoopSigner(publicKey(fromAccountAddress));

    for (const { address, nftType } of mintAddresses) {
      const mint = new PublicKey(address);
      let detectedType = nftType;

      // Auto-detect if type not specified
      if (detectedType === "auto" || !detectedType) {
        detectedType = await detectNFTType(umi, mint, fromAccountAddress);
      }

      logger.info(
        `Processing NFT transfer for ${address}, detected type: ${detectedType}`
      );

      switch (detectedType.toLowerCase()) {
        case "legacy":
        case "standard":
          return await handleLegacyNFT({
            umi,
            transaction,
            mint,
            fromAccountAddress,
            toAccountAddress,
            direction,
          });

        case "pnft":
        case "programmable":
          const serializedPNFT = await handlePNFT({
            umi,
            mint,
            toAccountAddress,
            fromAccountAddress,
            direction,
          });
          return serializedPNFT;

        case "mplcore":
        case "core":
          return await handleMPLCore({
            umi,
            mint,
            toAccountAddress,
            fromAccountAddress,
            direction,
          });

        case "cnft":
        case "compressed":
          return await handleCNFT({
            umi,
            mint,
            toAccountAddress,
            fromAccountAddress,
            direction,
          });

        default:
          logger.warn(
            `Unknown NFT type: ${detectedType}. Falling back to legacy transfer.`
          );
          return await handleLegacyNFT({
            umi,
            transaction,
            mint,
            fromAccountAddress,
            toAccountAddress,
            direction,
          });
      }
    }
  } catch (error) {
    logger.error("Error in addNftSendTransaction: ", error);
    throw error;
  }
};

module.exports = { addNftSendTransaction, detectNFTType };
