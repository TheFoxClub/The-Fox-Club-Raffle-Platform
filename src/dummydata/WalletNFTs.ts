// Define the structure of an NFT item for better type safety (optional but recommended)
interface NFT {
  id: number;
  name: string;
  collection: string;
  image: string;
  mint: string;
}

export const mockWalletNFTs: NFT[] = [
  {
    id: 1,
    name: "Fox Club #1234",
    collection: "The Fox Club",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400",
    mint: "7xKXtg...",
  },
  {
    id: 2,
    name: "Fox Club #5678",
    collection: "The Fox Club",
    image: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=400",
    mint: "8yLZuh...",
  },
  {
    id: 3,
    name: "Fox Club #9012",
    collection: "The Fox Club",
    image: "https://images.unsplash.com/photo-1516728778615-2d590ea1855e?w=400",
    mint: "9zMAvj...",
  },
];
