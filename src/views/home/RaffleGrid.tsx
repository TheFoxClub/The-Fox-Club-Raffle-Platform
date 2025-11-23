import { RaffleCard } from "./RaffleCard";
import { Flame, Clock } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/Tabs";
import { raffleData } from "../../../public/dummydata/mockRaffles";

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
