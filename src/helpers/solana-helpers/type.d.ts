import { CreatorInput } from "@metaplex-foundation/js";

export interface MetaplexConfig {
  price: Number;
  number: Number;
  sellerFeeBasisPoints: Number;
  creators: Array<{
    address: PublicKey;
    share: number;
    authority?: Signer;
  }>;
  solTreasuryAccount: string;
  goLiveDate: string;
  uploadMethod: "bundlr" | "nft_storage";
  nftStorageAuthToken: string;
  isMutable: boolean;
  isSequential: boolean;
  symbol: string;
  // retainAuthority: boolean;
  // whitelistMintSettings: {
  //   mode: "burnEveryTime";
  //   mint: "CMrGApouL71U7QA1gKYFADLndvB2HguAhXFBTj7DTLQf";
  //   presale: false;
  //   discountPrice: null;
  // };
  // endSettings: null;
  // splTokenAccount: null;
  // splToken: null;
  // hiddenSettings: null;
  // freezeTime: null;
  // gatekeeper?: null;
  // awsConfig: null;
  // nftStorageAuthToken: null;
  // shdwStorageAccount: null;
  // pinataConfig: null;
}

export interface MetaplexCache {
  program: {
    candyMachine: string;
    candyMachineCreator: string;
    collectionMint: string;
  };
  items: {
    [key: string]: {
      name: string;
      image_hash: string;
      image_link: string;
      metadata_hash: string;
      metadata_link: string;
      onChain: boolean;
    };
  };
}
