const { Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");

const {
  MPL_TOKEN_METADATA_PROGRAM_ID,
  transferV1,
  TokenStandard,
  findTokenRecordPda,
  fetchDigitalAssetWithAssociatedToken,
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

const connection = getConnectionDas();
const MPL_CORE_PROGRAM_ID = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";
const { logger } = require("../../util/logger");

/**
 * Handle legacy NFT transfer
 */
const handleLegacyNFT = async ({
  umi,
  transaction,
  mintAddress,
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
    const mint = new PublicKey(mintAddress);

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
      payer: umi.payer.publicKey,
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
  mintAddress,
  toAccountAddress,
  fromAccountAddress,
  direction,
}) => {
  try {
    logger.info(
      `Processing pNFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`
    );

    const frontEndSigner = createNoopSigner(publicKey(toAccountAddress));
    const umiTo = publicKey(toAccountAddress);
    const umiFrom = publicKey(fromAccountAddress);

    const asset = await fetchDigitalAssetWithAssociatedToken(
      umi,
      publicKey(mintAddress),
      umiFrom
    );

    const destinationTokenAccount = findAssociatedTokenPda(umi, {
      mint: asset.mint,
      owner: toAccountAddress,
    });

    const destinationTokenRecord = findTokenRecordPda(umi, {
      mint: asset.mint,
      token: destinationTokenAccount[0],
    });

    const txBuilder = await transferV1(umi, {
      mint: asset.mint,
      destinationOwner: umiTo,
      destinationTokenRecord: destinationTokenRecord,
      tokenRecord: asset.tokenRecord?.publicKey,
      tokenStandard: TokenStandard.ProgrammableNonFungible,
      authorizationRules:
        unwrapOptionRecursively(asset.metadata.programmableConfig)?.ruleSet ||
        undefined,
      authorizationRulesProgram: getMplTokenAuthRulesProgramId(umi),
      authorizationData: undefined,
      payer: frontEndSigner,
    })
      .useV0()
      .buildWithLatestBlockhash(umi);

    const serializedCreateAssetTx = umi.transactions.serialize(txBuilder);
    const serializedCreateAssetTxAsString = base64.deserialize(
      serializedCreateAssetTx
    )[0];

    return {
      serializedTx: serializedCreateAssetTxAsString,
      checksum: generateChecksum(txBuilder.message),
      type: "pnft",
      direction,
    };
  } catch (error) {
    logger.error(`pNFT transfer failed:`, error);
    throw error;
  }
};

/**
 * Handle MPL Core NFT transfer
 */
const handleMPLCore = async ({
  umi,
  mintAddress,
  toAccountAddress,
  fromAccountAddress,
  direction,
}) => {
  try {
    logger.info(
      `Processing MPL Core NFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`
    );

    const frontEndSigner = createNoopSigner(publicKey(toAccountAddress));
    const coreAsset = await fetchAsset(umi, publicKey(mintAddress));

    const fftx = await transferCoreV1(umi, {
      asset: coreAsset.publicKey,
      collection: coreAsset.updateAuthority.address,
      authority: umi.identity,
      payer: frontEndSigner,
      newOwner: frontEndSigner.publicKey,
    })
      .useV0()
      .buildWithLatestBlockhash(umi);

    const serializedCreateAssetTx = umi.transactions.serialize(fftx);
    const serializedCreateAssetTxAsString = base64.deserialize(
      serializedCreateAssetTx
    )[0];

    return {
      serializedTx: serializedCreateAssetTxAsString,
      checksum: generateChecksum(fftx.message),
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
  mintAddress,
  toAccountAddress,
  fromAccountAddress,
  direction,
}) => {
  try {
    logger.info(
      `Processing cNFT transfer ${direction}: ${fromAccountAddress} → ${toAccountAddress}`
    );

    const assetWithProof = await getAssetWithProof(umi, publicKey(mintAddress));

    const transferResult = await transferV2(umi, {
      ...assetWithProof,
      leafOwner: publicKey(fromAccountAddress),
      newLeafOwner: publicKey(toAccountAddress),
    }).sendAndConfirm(umi);

    return {
      serializedTx: null,
      signature: transferResult.signature,
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
const detectNFTType = async (umi, mintAddress) => {
  try {
    // Try to fetch as MPL Core first
    try {
      const coreAsset = await fetchAsset(umi, publicKey(mintAddress), {
        skipDerivePlugins: false,
      });

      if (coreAsset.header?.owner?.toString() === MPL_CORE_PROGRAM_ID) {
        return "mplcore";
      }
    } catch (coreError) {
      // Not MPL Core, continue checking
    }

    // Try to fetch as Token Metadata asset
    try {
      const asset = await fetchDigitalAssetWithAssociatedToken(
        umi,
        publicKey(mintAddress),
        umi.identity.publicKey
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
      // Not standard NFT, try cNFT
      return "cnft";
    }
  } catch (error) {
    logger.error(`Failed to detect NFT type for ${mintAddress}:`, error);
    return "unknown";
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
    const umi = getUmi();
    umi.use(mplTokenMetadata()).use(mplCore()).use(mplBubblegum());

    // Process each NFT
    for (const { address, nftType } of mintAddresses) {
      const mintAddress = new PublicKey(address);
      let detectedType = nftType;

      // Auto-detect if type not specified
      if (detectedType === "auto" || !detectedType) {
        detectedType = await detectNFTType(umi, mintAddress);
      }

      switch (detectedType.toLowerCase()) {
        case "legacy":
        case "standard":
          return await handleLegacyNFT({
            umi,
            transaction,
            mintAddress,
            fromAccountAddress,
            toAccountAddress,
            direction,
          });

        case "pnft":
        case "programmable":
          return await handlePNFT({
            umi,
            mintAddress,
            toAccountAddress,
            fromAccountAddress,
            direction,
          });

        case "mplcore":
        case "core":
          return await handleMPLCore({
            umi,
            mintAddress,
            toAccountAddress,
            fromAccountAddress,
            direction,
          });

        case "cnft":
        case "compressed":
          return await handleCNFT({
            umi,
            mintAddress,
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
            mintAddress,
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
