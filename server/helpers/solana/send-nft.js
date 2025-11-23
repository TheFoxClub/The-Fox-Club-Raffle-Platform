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
const { fromWeb3JsKeypair, toWeb3JsLegacyTransaction } = require("@metaplex-foundation/umi-web3js-adapters");

const {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");

const { findAssociatedTokenPda } = require("@metaplex-foundation/mpl-toolbox");
const { getMplTokenAuthRulesProgramId, mplCandyMachine } = require("@metaplex-foundation/mpl-candy-machine");

const { mplCore, fetchAsset, transferV1: transferCoreV1 } = require("@metaplex-foundation/mpl-core");

const {
  fetchMerkleTree,
  getCurrentRoot,
  hashMetadataCreators,
  hashMetadataData,
  transfer: transferCNFT,
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
const { min } = require("moment/moment");
const { generateChecksum } = require("./checksum-validation");

const connection = getConnectionDas();
const MPL_CORE_PROGRAM_ID = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

const handleLegacyNFT = async ({ umi, transaction, mintAddress, fromAccountAddress, toAccountAddress }) => {
  // console.log(`📦 Adding legacy NFT transfer for ${mintAddress.toBase58()}`);
  const from = new PublicKey(fromAccountAddress);
  const to = new PublicKey(toAccountAddress);
  const fromAta = await getAssociatedTokenAddress(mintAddress, from);
  const toAta = await getAssociatedTokenAddress(mintAddress, to);

  const toAtaInfo = await connection.getAccountInfo(toAta);
  if (!toAtaInfo) {
    transaction.add(createAssociatedTokenAccountInstruction(from.publicKey, toAta, to, mintAddress));
  }

  transaction.add(createTransferInstruction(fromAta, toAta, from.publicKey, 1));

  let tx = umi.transactions.create({
    version: "legacy",
    blockhash: (await umi.rpc.getLatestBlockhash()).blockhash,
    instructions: transaction.instructions,
    payer: umi.payer.publicKey,
  });

  const serializedTx = umi.transactions.serialize(tx);
  const txBase64 = base64.deserialize(serializedTx)[0];

  return { serializedTx: txBase64, checksum: generateChecksum(tx.message) };
};

const handlePNFT = async ({ umi, mintAddress, toAccountAddress }) => {
  // console.log(`📦 Adding pNFT transfer for ${mintAddress.toBase58()}`);

  const frontEndSigner = createNoopSigner(publicKey(toAccountAddress));
  const umiTo = publicKey(toAccountAddress);

  const asset = await fetchDigitalAssetWithAssociatedToken(
    umi,
    publicKey(mintAddress.toBase58()),
    umi.identity.publicKey,
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
    authorizationRules: unwrapOptionRecursively(asset.metadata.programmableConfig)?.ruleSet || undefined,
    authorizationRulesProgram: getMplTokenAuthRulesProgramId(umi),
    authorizationData: undefined,
    payer: frontEndSigner,
  })
    .useV0()
    .buildWithLatestBlockhash(umi);

  const serializedCreateAssetTx = umi.transactions.serialize(txBuilder);
  const serializedCreateAssetTxAsString = base64.deserialize(serializedCreateAssetTx)[0];

  return { serializedTx: serializedCreateAssetTxAsString, checksum: generateChecksum(txBuilder.message) };
};

/**
 * Handles cNFT (compressed NFT) transfers
 */
// const handleCNFT = async (umi, mint, toAccountAddress, cNFTData) => {
//   console.log(`🌳 Transferring cNFT: ${mintAddress.toBase58()}`);

//   const frontEndSigner = createNoopSigner(publicKey(toAccountAddress));
//   const umiTo = publicKey(toAccountAddress);

//   // Extract cNFT specific data
//   const { merkleTree, root, dataHash, creatorHash, nonce, index, proof = [] } = cNFTData;

//   if (!merkleTree || !root || !dataHash || !creatorHash || nonce === undefined || index === undefined) {
//     throw new Error(
//       "Missing required cNFT data: merkleTree, root, dataHash, creatorHash, nonce, and index are required",
//     );
//   }

//   const transferTx = await transferCNFT(umi, {
//     leafOwner: umi.identity,
//     newLeafOwner: umiTo,
//     merkleTree: publicKey(merkleTree),
//     root: root,
//     dataHash: dataHash,
//     creatorHash: creatorHash,
//     nonce: nonce,
//     index: index,
//     proof: proof,
//     payer: frontEndSigner,
//     ...(await getCompressionPrograms(umi)),
//   })
//     .setBlockhash(await umi.rpc.getLatestBlockhash())
//     .buildAndSign(umi);

//   const serializedTx = umi.transactions.serialize(transferTx);
//   const serializedTxAsString = base64.deserialize(serializedTx)[0];

//   return serializedTxAsString;
// };
// const handleCNFT = async (umi, mint, toAccountAddress) => {
//   try {
//     // console.log(umi.rpc);
//     const options = {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: '{"jsonrpc":"2.0","id":"1","method":"getAssetProof","params":{"id":"48bLXqSBEJzzx4sUiLBvT92rXqCxfkaQskZFudR7aw2r"}}',
//     };
//     fetch("https://devnet.helius-rpc.com/?api-key=.....", options)
//       .then((response) => response.json())
//       .then((response) => console.log(response))
//       .catch((err) => console.error(err));
//     console.log("mint: ", mintAddress.toBase58());
//     const assetWithProof = await getAssetWithProof(umi, publicKey(mintAddress.toBase58()));

//     console.log(`🌳 Transferring cNFT: `, assetWithProof);
//     await transferV2(umi, {
//       ...assetWithProof,
//       authority: umi.identity,
//       payer: createNoopSigner(publicKey(toAccountAddress)),
//       leafOwner: umi.identity.publicKey,
//       newLeafOwner: publicKey(toAccountAddress),
//     }).sendAndConfirm(umi);
//   } catch (error) {
//     console.error("Error in handleCNFT: ", error);
//     throw error;
//   }
// };

/**
 * Handles MPL Core NFT transfers
 */
const handleMPLCore = async ({ umi, mintAddress, toAccountAddress }) => {
  console.log(`⚙️ Transferring MPL Core NFT: ${mintAddress.toBase58()}`);

  const frontEndSigner = createNoopSigner(publicKey(toAccountAddress));
  const coreAsset = await fetchAsset(umi, publicKey(mintAddress.toBase58()));

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
  const serializedCreateAssetTxAsString = base64.deserialize(serializedCreateAssetTx)[0];

  return { serializedTx: serializedCreateAssetTxAsString, checksum: generateChecksum(fftx.message) };
};

/**
 * Detects NFT type automatically
 */
const detectNFTType = async (umi, mintAddress) => {
  try {
    // Try to fetch as MPL Core first
    const coreAsset = await fetchAsset(umi, publicKey(mintAddress.toBase58()), {
      skipDerivePlugins: false,
    });

    console.log("core asset: ", coreAsset);

    if (coreAsset.header?.owner?.toString() === MPL_CORE_PROGRAM_ID) {
      return "mplcore";
    }
  } catch (error) {
    // Not an MPL Core asset, continue checking
  }

  try {
    // Try to fetch as Token Metadata asset
    const asset = await fetchDigitalAssetWithAssociatedToken(
      umi,
      publicKey(mintAddress.toBase58()),
      umi.identity.publicKey,
    );

    if (asset.metadata.tokenStandard.value === TokenStandard.ProgrammableNonFungible) {
      return "pnft";
    } else {
      return "legacy";
    }
  } catch (error) {
    return "cnft";
  }

  // try {
  //   console.log("test😃");
  //   console.log("mint: ", mint);
  //   console.log(umi.rpc);
  //   const data = await getCNFTAssetData(umi, mint);
  //   console.log("data: ", data);
  //   const asset = await umi.rpc.getAsset({ assetId: publicKey(mint) });
  //   console.log("asset: ", asset);

  //   if (coreAsset.header?.owner?.toString() === MPL_CORE_PROGRAM_ID) {
  //     return "mplcore";
  //   }
  // } catch (error) {
  //   console.log("error: ", error);
  //   // return "legacy";
  //   // Not an MPL Core asset, continue checking
  // }
};

/**
 * Helper function to get cNFT asset data from DAS API
 * This is a placeholder - you'll need to implement based on your DAS API setup
 */
const getCNFTAssetData = async (umi, assetId) => {
  try {
    // This is where you'd call your DAS API to get cNFT proof data
    // Example structure - replace with actual DAS API calls

    const response = await fetch(`${process.env.REACT_APP_SOLANA_RPC_POOL_DAS_API}/assets/${assetId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`DAS API request failed: ${response.statusText}`);
    }

    const assetData = await response.json();

    return {
      merkleTree: assetData.compression?.tree,
      root: assetData.compression?.root,
      dataHash: assetData.compression?.data_hash,
      creatorHash: assetData.compression?.creator_hash,
      nonce: assetData.compression?.leaf_id,
      index: assetData.compression?.leaf_id,
      proof: assetData.compression?.proof || [],
    };
  } catch (error) {
    console.error("Error fetching cNFT data from DAS:", error);
    throw error;
  }
};

/**
 * Main function to add NFT transfer instructions based on NFT type
 * @param {Object} options
 * @param {Transaction} options.transaction - Solana transaction object
 * @param {Array} options.mintAddresses - List of { address, nftType } objects
 * @param {string} options.toAccountAddress - Destination wallet address
 * @param {string} options.fromAccountAddress - Source wallet address
 * @returns {Transaction | string} - Updated transaction or serialized transaction string
 */
const addNftSendTransaction = async ({ transaction, mintAddresses, toAccountAddress, fromAccountAddress }) => {
  try {
    const umi = getUmi();
    umi.use(mplTokenMetadata()).use(mplCore()).use(mplBubblegum());

    for (const { address, nftType } of mintAddresses) {
      const mintAddress = new PublicKey(address);
      let detectedType = nftType;

      detectedType = await detectNFTType(umi, mintAddress);

      switch (detectedType.toLowerCase()) {
        case "legacy":
        case "standard":
          const serializedLegacyNFT = await handleLegacyNFT({
            umi,
            transaction,
            mintAddress,
            fromAccountAddress,
            toAccountAddress,
          });
          return serializedLegacyNFT;

        case "pnft":
        case "programmable":
          const serializedPNFT = await handlePNFT({ umi, mintAddress, toAccountAddress });
          return serializedPNFT;

        case "mplcore":
        case "core":
          const serializedCore = await handleMPLCore({ umi, mintAddress, toAccountAddress });
          return serializedCore;

        // case "cnft":
        //   // For MPL Core, return the serialized transaction immediately
        //   // Note: This assumes only one MPL Core NFT at a time
        //   const serializedCnft = await handleCNFT(umi, mint, toAccountAddress);
        //   return serializedCnft;

        default:
          console.warn(`⚠️ Unknown NFT type: ${detectedType}. Falling back to legacy transfer.`);
          throw new Error(`Unsupported NFT type: ${detectedType}`);
      }
    }
  } catch (error) {
    console.error("Error in addNftSendTransaction: ", error);
    throw error;
  }
};

module.exports = { addNftSendTransaction };
