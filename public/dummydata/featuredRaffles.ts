import card1 from "../../public/assets/card1.jpg";
import card2 from "../../public/assets/card2.jpg";

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
    image: card1,
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
    image: card2,
    tokenType: "USDC",
    isVerified: true,
  },
];
