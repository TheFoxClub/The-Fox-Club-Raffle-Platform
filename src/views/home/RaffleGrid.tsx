import { RaffleCard } from "./RaffleCard";
import { useEffect, useState } from "react";
import { Flame, Clock, Calendar } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/Tabs";
// import { raffleData } from "../../dummydata/mockRaffles";
import { Link } from "react-router-dom";
import server from "../../config/server";
import { toast } from "react-toastify";

interface RaffleData {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  ticketPrice: string;
  ticketSold: number;
  totalTickets: number;
  tokenType: number;
  numberOfWinners: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  raffle_detail: {
    isFeatured: boolean;
    requiresNftVerification: boolean;
  };
}

function formatCountdown(endDate: string) {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  let diff = end - now;

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff %= 1000 * 60 * 60 * 24;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff %= 1000 * 60 * 60;

  return `${days}d ${hours}h`;
}

export const RaffleGrid = () => {
  const [raffles, SetRaffles] = useState<RaffleData[]>([]);
  const [endedRaffles, setEndedRaffles] = useState<RaffleData[]>([]);
  const [upcomingRaffles, setUpcomingRaffles] = useState<RaffleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRaffles = async () => {
      try {
        setLoading(true);

        //fetch live raffles
        const liveRes = await server.get("/raffle/live");
        if (liveRes.data.success) {
          SetRaffles(liveRes.data.data.raffles);
        }
        //fetch ended raffles
        const endedRes = await server.get("/raffle/ended");
        if (endedRes.data.success) {
          setEndedRaffles(endedRes.data.data.raffles);
        }
        //fetch upcoming raffles
        const upcomingRes = await server.get("/raffle/upcoming");
        if (upcomingRes.data.success) {
          setUpcomingRaffles(upcomingRes.data.data.raffles);
        }
      } catch (error: any) {
        console.error(error);
        toast.error(error.response?.data?.message || "Failed to fetch raffles");
      } finally {
        setLoading(false);
      }
    };
    fetchRaffles();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading raffles...
      </div>
    );
  }

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
        <TabsTrigger value="upcoming" className="gap-2 flex-1 sm:flex-none">
          <Calendar className="h-4 w-4" />
          Upcoming Raffles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="live" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Live Raffles</h2>
          <span className="text-sm text-muted-foreground">
            {raffles.length} active raffles
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {raffles.map((raffle) => {
            const mappedRaffle = {
              id: raffle.id,
              title: raffle.title,
              image: raffle.imageUrl,
              price: raffle.ticketPrice,
              sold: Number(raffle.ticketSold) || 0,
              total: Number(raffle.totalTickets) || 0,
              tokenType:
                raffle.tokenType === 0
                  ? "SOL"
                  : raffle.tokenType === 1
                  ? "USDC"
                  : raffle.tokenType === 2
                  ? "BONK"
                  : "USDT",
              winners: raffle.numberOfWinners,
              endTime: formatCountdown(raffle.endDate),
              isVerified: raffle.raffle_detail.requiresNftVerification,
              isFeatured: raffle.raffle_detail.isFeatured,
            };
            return (
              <Link to={`/raffle/${raffle.id}`} key={raffle.id}>
                <RaffleCard {...mappedRaffle} />
              </Link>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="ended" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ended Raffles</h2>
          <span className="text-sm text-muted-foreground">
            {endedRaffles.length} ended raffles
          </span>
        </div>
        {endedRaffles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {endedRaffles.map((raffle) => {
              const mappedRaffle = {
                id: raffle.id,
                title: raffle.title,
                image: raffle.imageUrl,
                price: raffle.ticketPrice,
                sold: Number(raffle.ticketSold) || 0,
                total: Number(raffle.totalTickets) || 0,
                tokenType:
                  raffle.tokenType === 0
                    ? "SOL"
                    : raffle.tokenType === 1
                    ? "USDC"
                    : raffle.tokenType === 2
                    ? "BONK"
                    : "USDT",
                winners: raffle.numberOfWinners,
                endTime: formatCountdown(raffle.endDate),
                isVerified: raffle.raffle_detail.requiresNftVerification,
                isFeatured: raffle.raffle_detail.isFeatured,
              };

              return (
                <Link to={`/raffle/${raffle.id}`} key={raffle.id}>
                  <RaffleCard {...mappedRaffle} />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 glass-card">
            <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Ended Raffles Yet</h3>
            <p className="text-muted-foreground">
              Completed raffles will appear here
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="upcoming" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Upcoming Raffles</h2>
          <span className="text-sm text-muted-foreground">
            {upcomingRaffles.length} upcoming raffles
          </span>
        </div>
        {upcomingRaffles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingRaffles.map((raffle) => {
              const mappedRaffle = {
                id: raffle.id,
                title: raffle.title,
                image: raffle.imageUrl,
                price: raffle.ticketPrice,
                sold: Number(raffle.ticketSold) || 0,
                total: Number(raffle.totalTickets) || 0,
                tokenType:
                  raffle.tokenType === 0
                    ? "SOL"
                    : raffle.tokenType === 1
                    ? "USDC"
                    : raffle.tokenType === 2
                    ? "BONK"
                    : "USDT",
                winners: raffle.numberOfWinners,
                endTime: formatCountdown(raffle.endDate),
                isVerified: raffle.raffle_detail.requiresNftVerification,
                isFeatured: raffle.raffle_detail.isFeatured,
              };

              return (
                <Link to={`/raffle/${raffle.id}`} key={raffle.id}>
                  <RaffleCard {...mappedRaffle} />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 glass-card">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              No Upcoming Raffles Yet
            </h3>
            <p className="text-muted-foreground">
              Upcoming raffles will appear here
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
