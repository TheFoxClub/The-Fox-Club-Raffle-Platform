interface Raffle {
  id: number;
  title: string;
  description: string;
  price: string;
  sold: number;
  total: number;
  image: string; // This holds the imported image path
  tokenType: string;
  isVerified: boolean;
}

export const featuredRaffles: Raffle[] = [
  {
    id: 1,
    title: "Rare Fox NFT Collection",
    description:
      "Win 1 of 3 exclusive Fox Club Genesis NFTs with unique traits",
    price: "0.5 SOL",
    sold: 78,
    total: 100,
    image: "/assets/card1.jpg",
    tokenType: "SOL",
    isVerified: true,
  },

  {
    id: 2,
    title: "5000 USDC Prize Pool",
    description: "Massive cash prize - Multiple winners guaranteed",
    price: "10 USDC",
    sold: 342,
    total: 500,
    image: "/assets/card2.jpg",
    tokenType: "USDC",
    isVerified: true,
  },
];
