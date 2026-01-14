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

const { findAssociatedTokenPda } = require("@metaplex-foundation/mpl-toolbox");
const {
  getMplTokenAuthRulesProgramId,
} = require("@metaplex-foundation/mpl-candy-machine");

const {
  mplCore,
  fetchAsset,
  transferV1: transferCoreV1,
} = require("@metaplex-foundation/mpl-core");

const {
  fetchMerkleTree,
  getCurrentRoot,
  hashMetadataCreators,
  hashMetadataData,
  getCompressionPrograms,
  mplBubblegum,
  getAssetWithProof,
  transferV2,
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
      type: "legacy_nft",
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
  direction,
  frontEndSigner,
}) => {
  try {
    logger.info(
      `Processing pNFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`
    );

    const umiTo = publicKey(toAccountAddress);
    const umiFrom = publicKey(fromAccountAddress);
    const mintPubkey = publicKey(mint.toBase58());

    logger.info(`Attempting to fetch pNFT asset: ${mint.toBase58()}`);

    // Try multiple approaches to get the asset information
    let asset = null;
    let ownerFound = false;

    // Method 1: fetchDigitalAssetWithAssociatedToken
    try {
      asset = await fetchDigitalAssetWithAssociatedToken(
        umi,
        mintPubkey,
        umiFrom
      );
      if (asset.owner) {
        ownerFound = true;
        logger.info(
          `Method 1 success - pNFT asset fetched with associated token:`,
          {
            mint: asset.mint.toString(),
            owner: asset.owner.toString(),
            tokenAccount: asset.token?.publicKey?.toString(),
          }
        );
      }
    } catch (fetchError) {
      logger.warn(
        `Method 1 failed - fetchDigitalAssetWithAssociatedToken:`,
        fetchError.message
      );
    }

    // Method 2: fetchDigitalAsset (fallback)
    if (!ownerFound) {
      try {
        asset = await fetchDigitalAsset(umi, mintPubkey);
        if (asset.owner) {
          ownerFound = true;
          logger.info(
            `Method 2 success - pNFT asset fetched without associated token:`,
            {
              mint: asset.mint.toString(),
              owner: asset.owner.toString(),
            }
          );
        }
      } catch (fallbackError) {
        logger.warn(
          `Method 2 failed - fetchDigitalAsset:`,
          fallbackError.message
        );
      }
    }

    // Method 3: Check if it's actually an MPL Core asset (misdetected)
    if (!ownerFound) {
      try {
        const coreAsset = await fetchAsset(umi, mintPubkey);
        if (coreAsset.owner) {
          logger.info(
            `This appears to be an MPL Core asset, not a pNFT. Redirecting...`
          );
          // Redirect to MPL Core handler
          return await handleMPLCore({
            umi,
            mint,
            toAccountAddress,
            fromAccountAddress,
            direction,
            frontEndSigner,
          });
        }
      } catch (coreError) {
        logger.warn(
          `Method 3 failed - not an MPL Core asset:`,
          coreError.message
        );
      }
    }

    // Method 4: Use DAS API to get owner information
    if (!ownerFound) {
      try {
        logger.info(`Trying DAS API to get asset owner...`);
        const dasResult = await umi.rpc.getAsset(mintPubkey);
        if (dasResult.ownership?.owner) {
          logger.info(`DAS API found owner: ${dasResult.ownership.owner}`);
          // Create a minimal asset object with owner info
          asset = {
            mint: mintPubkey,
            owner: publicKey(dasResult.ownership.owner),
            metadata: dasResult,
          };
          ownerFound = true;
        }
      } catch (dasError) {
        logger.warn(`Method 4 failed - DAS API:`, dasError.message);
      }
    }

    // If we still don't have owner information, this might not be a valid NFT
    if (!ownerFound || !asset?.owner) {
      throw new Error(
        `Could not determine owner for NFT mint: ${mint.toBase58()}. This may not be a valid pNFT or the NFT may not exist.`
      );
    }

    // Verify the user owns this asset
    if (asset.owner.toString() !== fromAccountAddress) {
      throw new Error(
        `pNFT owner mismatch. Expected: ${fromAccountAddress}, Actual: ${asset.owner.toString()}`
      );
    }

    // Now proceed with the transfer setup
    // Derive the associated token accounts
    const sourceTokenAccountPda = findAssociatedTokenPda(umi, {
      mint: mintPubkey,
      owner: fromAccountAddress,
    });
    const sourceTokenAccount = sourceTokenAccountPda[0];

    const destinationTokenAccount = findAssociatedTokenPda(umi, {
      mint: mintPubkey,
      owner: toAccountAddress,
    });

    // Derive token records
    const sourceTokenRecordPda = findTokenRecordPda(umi, {
      mint: mintPubkey,
      token: sourceTokenAccount,
    });

    const destinationTokenRecord = findTokenRecordPda(umi, {
      mint: mintPubkey,
      token: destinationTokenAccount[0],
    });

    // Create noop signer for the user (owner of the NFT)
    const userSigner = createNoopSigner(umiFrom);

    logger.info(`pNFT transfer setup:`, {
      mint: mintPubkey.toString(),
      sourceTokenAccount: sourceTokenAccount.toString(),
      destinationTokenAccount: destinationTokenAccount[0].toString(),
      sourceTokenRecord: sourceTokenRecordPda[0].toString(),
      destinationTokenRecord: destinationTokenRecord[0].toString(),
    });

    // Build the transaction with proper signer setup for pNFTs
    const txBuilder = await transferV1(umi, {
      mint: mintPubkey,
      authority: userSigner, // User is the authority (current owner)
      tokenOwner: umiFrom, // Explicitly set token owner
      token: sourceTokenAccount, // Use the source token account
      destinationOwner: umiTo,
      destinationToken: destinationTokenAccount[0], // Destination token account
      tokenRecord: sourceTokenRecordPda[0], // Source token record
      destinationTokenRecord: destinationTokenRecord[0], // Destination token record
      tokenStandard: TokenStandard.ProgrammableNonFungible,
      authorizationRules: undefined, // letting the system determine this
      authorizationRulesProgram: getMplTokenAuthRulesProgramId(umi),
      authorizationData: undefined,
      payer: userSigner, // User pays fees - explicitly set to same as authority
    })
      .useV0()
      .buildWithLatestBlockhash(umi);

    logger.info(
      `pNFT transaction signatures length: ${txBuilder.signatures.length}`
    );
    logger.info(
      `pNFT required signatures: ${txBuilder.message.header.numRequiredSignatures}`
    );

    // For pNFTs, we need to handle the case where multiple signatures are required
    // but we want the user to only sign once. Let's try to get signer information safely.

    try {
      // Check if we can access the account keys safely
      if (txBuilder.message && txBuilder.message.staticAccountKeys) {
        const signers = txBuilder.message.staticAccountKeys.slice(
          0,
          txBuilder.message.header.numRequiredSignatures
        );
        logger.info(
          `pNFT signers:`,
          signers.map((s) => s.toString())
        );

        // If both signers are the same user, we have a duplicate signer issue
        const userPubkey = umiFrom.toString();
        const duplicateSigners = signers.filter(
          (s) => s.toString() === userPubkey
        );

        if (duplicateSigners.length > 1) {
          logger.info(
            `pNFT has duplicate signers for user ${userPubkey}, this may cause signature issues`
          );
        }
      } else {
        logger.warn(
          `pNFT transaction message structure is different than expected`
        );
        logger.info(
          `pNFT message keys available:`,
          Object.keys(txBuilder.message || {})
        );
      }
    } catch (signerError) {
      logger.warn(`Could not analyze pNFT signers:`, signerError.message);
    }

    // Use the same signature clearing approach as MPL Core
    const serializedWithSigs = umi.transactions.serialize(txBuilder);
    const serializedBytes = new Uint8Array(serializedWithSigs);

    // Log the original transaction for debugging
    logger.info(`pNFT original serialized length: ${serializedBytes.length}`);
    logger.info(
      `pNFT first 10 bytes: ${Array.from(serializedBytes.slice(0, 10))}`
    );

    // The first byte should be the number of signatures
    const numSigs = serializedBytes[0];
    logger.info(`pNFT number of signatures: ${numSigs}`);

    // Zero out all signature bytes (64 bytes per signature, starting from byte 1)
    for (let i = 1; i <= numSigs * 64; i++) {
      serializedBytes[i] = 0;
    }

    const serializedTx = Buffer.from(serializedBytes).toString("base64");

    logger.info(`pNFT transaction signatures zeroed out manually`);

    return {
      serializedTx: serializedTx,
      checksum: "pnft_umi",
      type: "pnft",
      direction,
    };
  } catch (error) {
    logger.error(`pNFT transfer failed:`, error);
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
      `Required signatures: ${builtTx.message.header.numRequiredSignatures}`
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
      `Processing cNFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`
    );

    const assetWithProof = await getAssetWithProof(
      umi,
      publicKey(mint.toBase58())
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
      `cNFT transaction signatures length: ${txBuilder.signatures.length}`
    );
    logger.info(
      `cNFT required signatures: ${txBuilder.message.header.numRequiredSignatures}`
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
      checksum: "cnft_umi",
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
  try {
    // Try to fetch as MPL Core first
    try {
      const coreAsset = await fetchAsset(umi, publicKey(mint.toBase58()), {
        skipDerivePlugins: false,
      });

      if (coreAsset.header?.owner?.toString() === MPL_CORE_PROGRAM_ID) {
        return "mplcore";
      }
    } catch (coreError) {
      // Not MPL Core, continue checking
    }

    // Try to fetch as Token Metadata asset with the actual owner
    try {
      const asset = await fetchDigitalAssetWithAssociatedToken(
        umi,
        publicKey(mint.toBase58()),
        publicKey(ownerPublicKey) // Use the actual owner, not platform wallet
      );

      if (
        asset.metadata.tokenStandard.value ===
        TokenStandard.ProgrammableNonFungible
      ) {
        return "pnft";
      } else {
        return "legacy";
      }
    } catch (tokenError) {
      logger.warn(
        `Failed to fetch as Token Metadata asset: ${tokenError.message}`
      );
      // Default to legacy instead of cNFT
      return "legacy";
    }
  } catch (error) {
    logger.error(`Failed to detect NFT type for ${mint}:`, error);
    return "legacy"; // Default to legacy
  }
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
          // pNFTs have complex signature requirements that are currently not supported
          throw new Error(
            "Programmable NFTs (pNFTs) are not currently supported for raffle rewards due to their complex signature requirements. Please use Legacy NFTs or MPL Core NFTs instead. We're working on adding pNFT support in a future update."
          );

        case "mplcore":
        case "core":
          // MPL Core NFTs also have complex signature requirements that are currently not supported
          throw new Error(
            "MPL Core NFTs are not currently supported for raffle rewards due to their complex signature requirements. Please use Legacy NFTs instead. We're working on adding MPL Core support in a future update."
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
