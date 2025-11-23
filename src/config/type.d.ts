export interface MyRoute {
  name: string | null;
}

export type RoutePropWalletStatus =
  | "connected"
  | "not-connected"
  | "not-required";

export type RoutePropLoginStatus =
  | "logged-in"
  | "not-logged-in"
  | "not-required";

export type PriceType = "SOL" | "MATIC";

interface RoyaltySplitType {
  percentage: number;
  address: string;
}

export interface NFTDetails {
  collectionName: string;
  symbol: string;
  launchDate: string;
  baseArtName: string;
  description: string;
  mintCost: number;
  royaltyPercentage: number;
  royaltySplit: Array<RoyaltySplitType>;
  nftStorageApiKey?: string;
}

interface NFTLayerImage {
  imageSrc: any;
  rarityPercentage: number;
  attributeValue: string;
}
export interface NFTLayer {
  name: string;
  blend?: GlobalCompositeOperation;
  opacity?: number;
  images?: Array<NFTLayerImage>;
  selectedImage?: NFTLayerImage;
}

export interface NFTConfiguration {
  imageWidth: number;
  imageHeight: number;
  numberOfNFts: number;
  uniqueDnaTorrance: number;
  category: string;
  fileType: "image/png" | "image/gif" | "image/jpg";
}

export interface ResponseDataType {
  success: boolean;
  message: string;
  data: null | any;
}

export interface ValidationErrorsType {
  [key: string]: string[];
}

export interface LuncherTimerDataType {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface TabButtonDataType {
  tabName: string;
  buttonName: string;
  countNumber?: number;
  activeTab: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export interface MyRouteProps {
  name: string;
  component: React.FC;
  path: string;
  getPath?: (param: any) => string;
  exact: boolean;
  walletStatus?: RoutePropWalletStatus;
  loginStatus?: RoutePropLoginStatus;
  nestedRoutes?: { [key: string]: NestedRoutes };
}

interface NestedRoutes {
  name: string;
  path?: string;
  component: React.FC;
  index?: boolean;
  end?: boolean;
  exact: boolean;
  icon?: string;
  getPath?: (param: any) => string;
}

export interface BaseModalProps {
  closing: boolean;
  onClose: () => void;
}

export interface LoginFromDataType {
  nonce: number;
  signature: string;
  pubkey: string;
}
