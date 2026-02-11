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
} = require("@metaplex-foundation/mpl-core");

const {
  getAssetWithProof,
  transferV2,
  mplBubblegum
} = require("@metaplex-foundation/mpl-bubblegum");

const wallet = require("./wallet.json");
const { getConnectionDas, getUmi } = require("../../config/solana");
const { dasApi } = require("@metaplex-foundation/digital-asset-standard-api");
const { base64 } = require("@metaplex-foundation/umi/serializers");
const { Wallet } = require("./wallet");
const { generateChecksum } = require("./checksum-validation");
const logger = require("../../util/logger");

const connection = getConnectionDas();
const MPL_CORE_PROGRAM_ID = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

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
      `Processing legacy NFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`,
    );

    const from = new PublicKey(fromAccountAddress);
    const to = new PublicKey(toAccountAddress);

    const fromAta = await getAssociatedTokenAddress(mint, from);
    const toAta = await getAssociatedTokenAddress(mint, to);

    // Check/create destination token account
    const toAtaInfo = await connection.getAccountInfo(toAta);
    if (!toAtaInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(from, toAta, to, mint),
      );
    }

    // Add transfer instruction
    transaction.add(createTransferInstruction(fromAta, toAta, from, 1));

    let tx = umi.transactions.create({
      version: "legacy",
      blockhash: (await umi.rpc.getLatestBlockhash()).blockhash,
      instructions: transaction.instructions,
      payer: publicKey(fromAccountAddress), // User is the payer, not platform
    });

    const serializedTx = umi.transactions.serialize(tx);
    const txBase64 = base64.deserialize(serializedTx)[0];

    return {
      serializedTx: txBase64,
      checksum: generateChecksum(tx.message),
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
      `Processing pNFT transfer (${direction}): ${fromAccountAddress} → ${toAccountAddress}`,
    );

    const umiTo = publicKey(toAccountAddress);
    const umiFrom = publicKey(fromAccountAddress);
    const mintPubkey = publicKey(mint.toBase58());

    if (direction === "platform_to_user") {
      logger.info(`Fetching pNFT asset...`);
      const asset = await fetchDigitalAssetWithAssociatedToken(
        umi,
        mintPubkey,
        umiFrom,
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

      // noop signer for the user (fee payer)
      const userPayerSigner = createNoopSigner(umiTo);

      logger.info(
        `Building pNFT transfer transaction with platform as authority, user as payer`,
      );
      logger.info(`Destination token account: ${destinationTokenAccount[0]}`);
      logger.info(`Destination token record: ${destinationTokenRecord[0]}`);

      const txBuilder = transferV1(umi, {
        mint: asset.mint.publicKey,
        authority: umi.identity, // Platform wallet (owns the pNFT)
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

      const builtTx = await txBuilder.useV0().buildWithLatestBlockhash(umi);

      logger.info(
        `Transaction built with ${builtTx.message.instructions.length} instructions, platform signing...`,
      );

      // Platform signs the transaction (partial signature)
      const platformSignedTx = await umi.identity.signTransaction(builtTx);

      logger.info(`Platform signed, serializing for user to sign...`);

      // Serialize the partially signed transaction
      const serializedTx = umi.transactions.serialize(platformSignedTx);
      const serializedTxString = base64.deserialize(serializedTx)[0];

      logger.info(
        `pNFT transfer transaction created with platform signature, ready for user signature`,
      );
      return {
        serializedTx: serializedTxString,
        blockhash: platformSignedTx.blockhash,
        checksum: generateChecksum(platformSignedTx.message),
        requiresUserSignature: true, // User needs to sign for fees
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
        umiFrom,
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
      `Processing MPL Core NFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`,
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
        `Asset owner mismatch. Expected: ${fromAccountAddress}, Actual: ${coreAsset.owner?.toString()}`,
      );
    }

    // Create noop signers for user (authority and payer)
    const userSigner = createNoopSigner(publicKey(fromAccountAddress));

    // Build transaction with user as authority (payer will default to authority)
    const builtTx = await transferCoreV1(umi, {
      asset: coreAsset.publicKey,
      collection: coreAsset.updateAuthority.address,
      authority: userSigner, // User is the authority (current owner)
      newOwner: publicKey(toAccountAddress), // Transfer to platform wallet
    })
      .useV0()
      .buildWithLatestBlockhash(umi);

    logger.info(`Transaction signatures length: ${builtTx.signatures.length}`);
    logger.info(
      `Required signatures: ${builtTx.message.header.numRequiredSignatures}`,
    );

    // Instead of clearing signatures, let's try a different approach
    // Serialize the transaction and manually replace signature bytes with zeros
    const serializedWithSigs = umi.transactions.serialize(builtTx);
    const serializedBytes = new Uint8Array(serializedWithSigs);

    // Log the original transaction for debugging
    logger.info(`Original serialized length: ${serializedBytes.length}`);
    logger.info(`First 10 bytes: ${Array.from(serializedBytes.slice(0, 10))}`);

    // The first byte should be the number of signatures
    const numSigs = serializedBytes[0];
    logger.info(`Number of signatures: ${numSigs}`);

    // Zero out all signature bytes (64 bytes per signature, starting from byte 1)
    for (let i = 1; i <= numSigs * 64; i++) {
      serializedBytes[i] = 0;
    }

    const serializedTx = Buffer.from(serializedBytes).toString("base64");

    logger.info(`MPL Core transaction signatures zeroed out manually`);

    return {
      serializedTx: serializedTx,
      checksum: "mpl_core_umi",
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
      `Processing cNFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`,
    );

    umi.use(mplBubblegum());

    const assetWithProof = await getAssetWithProof(
      umi,
      publicKey(mint.toBase58()),
    );

    logger.info(`cNFT asset with proof fetched:`, {
      mint: mint.toBase58(),
      leafOwner: fromAccountAddress,
      newLeafOwner: toAccountAddress,
      proof: assetWithProof.proof ? "Present" : "Missing",
    });

    // Create noop signer for the user
    const userSigner = createNoopSigner(publicKey(fromAccountAddress));

    // Build unsigned transaction for user to sign
    const txBuilder = await transferV2(umi, {
      ...assetWithProof,
      leafOwner: publicKey(fromAccountAddress),
      newLeafOwner: publicKey(toAccountAddress),
      payer: userSigner, // User pays fees
    })
      .useV0()
      .buildWithLatestBlockhash(umi);

    logger.info(
      `cNFT transaction signatures length: ${txBuilder.signatures.length}`,
    );
    logger.info(
      `cNFT required signatures: ${txBuilder.message.header.numRequiredSignatures}`,
    );

    // Use the same signature clearing approach as other NFT types
    const serializedWithSigs = umi.transactions.serialize(txBuilder);
    const serializedBytes = new Uint8Array(serializedWithSigs);

    // The first byte should be the number of signatures
    const numSigs = serializedBytes[0];
    logger.info(`cNFT number of signatures: ${numSigs}`);

    // Zero out all signature bytes (64 bytes per signature, starting from byte 1)
    for (let i = 1; i <= numSigs * 64; i++) {
      serializedBytes[i] = 0;
    }

    const serializedTx = Buffer.from(serializedBytes).toString("base64");

    logger.info(`cNFT transaction created successfully`);

    return {
      serializedTx: serializedTx,
      checksum: generateChecksum(txBuilder.message),
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
        `Processing NFT transfer for ${address}, detected type: ${detectedType}`,
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
          // MPL Core NFTs also have complex signature requirements that are currently not supported
          throw new Error(
            "MPL Core NFTs are not currently supported for raffle rewards due to their complex signature requirements. Please use Legacy NFTs instead. We're working on adding MPL Core support in a future update.",
          );

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
            `Unknown NFT type: ${detectedType}. Falling back to legacy transfer.`,
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
