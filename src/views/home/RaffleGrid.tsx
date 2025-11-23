import type { RaffleCardProps } from "./RaffleCard";
import { RaffleCard } from "./RaffleCard";
import { Flame, Clock } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/Tabs";
import card1 from "../../../public/assets/card1.jpg";
import card2 from "../../../public/assets/card2.jpg";
import card3 from "../../../public/assets/card3.jpg";
import card4 from "../../../public/assets/card4.jpg";
import card5 from "../../../public/assets/card5.jpg";
import card6 from "../../../public/assets/card5.jpg";

const raffleData: RaffleCardProps[] = [
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

export const RaffleGrid = () => {
  return (
    <Tabs defaultValue="live" className="space-y-2 z-20 mt-10">
      <TabsList className="glass-card p-1 w-full sm:w-auto">
        <TabsTrigger value="live" className="gap-2 flex-1 sm:flex-none">
          <Flame className="h-4 w-4" />
          Live Raffles
        </TabsTrigger>
        <TabsTrigger value="ended" className="gap-2 flex-1 sm:flex-none">
          <Clock className="h-4 w-4" />
          Ended Raffles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="live" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Live Raffles</h2>
          <span className="text-sm text-muted-foreground">
            {raffleData.length} active raffles
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {raffleData.map((raffle) => (
            <RaffleCard key={raffle.id} {...raffle} />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="ended" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ended Raffles</h2>
          <span className="text-sm text-muted-foreground">0 ended raffles</span>
        </div>
        <div className="text-center py-16 glass-card">
          <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Ended Raffles Yet</h3>
          <p className="text-muted-foreground">
            Completed raffles will appear here
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
};
