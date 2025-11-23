import type { RaffleCardProps } from "../../src/views/home/RaffleCard";
import card1 from "../assets/card1.jpg";
import card2 from "../assets/card2.jpg";
import card3 from "../assets/card3.jpg";
import card4 from "../assets/card4.jpg";
import card5 from "../assets/card5.jpg";
import card6 from "../assets/card5.jpg";

// Export the data array
export const raffleData: RaffleCardProps[] = [
  {
    id: 1,
    image: card1,
    title: "Legendary Fox Founder Pass",
    price: "0.5",
    sold: 78,
    total: 100,
    endTime: "2d 5h",
    tokenType: "SOL",
    isVerified: true,
    isFeatured: true,
  },
  {
    id: 2,
    image: card2,
    title: "5000 USDC Grand Prize",
    price: "10",
    sold: 342,
    total: 500,
    endTime: "1d 12h",
    tokenType: "USDC",
    isVerified: true,
    isFeatured: false,
  },
  {
    id: 3,
    image: card3,
    title: "Rare Solana NFT Bundle",
    price: "0.25",
    sold: 145,
    total: 200,
    endTime: "3d 8h",
    tokenType: "SOL",
    isVerified: false,
    isFeatured: false,
  },
  {
    id: 4,
    image: card4,
    title: "Premium Hardware Wallet",
    price: "5",
    sold: 89,
    total: 150,
    endTime: "4d 2h",
    tokenType: "USDC",
    isVerified: true,
    isFeatured: false,
  },
  {
    id: 5,
    image: card5,
    title: "Fox Club Merchandise Pack",
    price: "0.1",
    sold: 256,
    total: 300,
    endTime: "12h",
    tokenType: "SOL",
    isVerified: false,
    isFeatured: false,
  },
  {
    id: 6,
    image: card6,
    title: "1000 BONK Token Airdrop",
    price: "1000",
    sold: 678,
    total: 1000,
    endTime: "5d",
    tokenType: "BONK",
    isVerified: true,
    isFeatured: false,
  },
];
