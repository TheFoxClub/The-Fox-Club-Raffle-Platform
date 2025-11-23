import card1 from "../assets/card1.jpg";

export interface RaffleType {
  id: number;
  image: string;
  title: string;
  description: string;
  price: number;
  total: number;
  sold: number;
  endTime: string;
  tokenType: string;
  isVerified: boolean;
  host: string;
  hostReputation: string;
  created: string;
  prizeValue: string;
  winners: number;
}

export const allRaffle = [
  {
    id: 1,
    image: card1,
    title: "Legendary Fox Raffle",
    description:
      "Win exclusive access to The Fox Club Founders tier with lifetime benefits including early access to all raffles, reduced fees, exclusive community channels, and special NFT airdrops. This is a one-time opportunity to join the elite members of The Fox Club.",
    price: 0.5,
    total: 100,
    sold: 78,
    endTime: "2d 5h 23m",
    tokenType: "SOL",
    isVerified: true,
    host: "7xKX...9mPq",
    hostReputation: "98",
    created: "2025-10-20",
    prizeValue: "~$2,500",
    winners: 1,
  },
];
