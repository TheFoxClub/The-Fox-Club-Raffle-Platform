import { RaffleCard } from "./RaffleCard";
import { useEffect, useState, useCallback } from "react";
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
import socketService from "../../services/socket.service";
import { getTokenSymbol } from "../../utils/tokenUtils";
import type { RaffleSortOption } from "./RaffleFilter";

interface RaffleData {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  ticketPrice: string;
  ticketsSold: number;
  totalTickets: number;
  tokenType: string;
  tokenAddress?: string;
  numberOfWinners: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  raffle_detail: {
    isFeatured: boolean;
    requiresNftVerification: boolean;
  };
}

type RaffleRealtimeUpdate = {
  raffleId?: number;
  action?: string;
  status?: string;
  newStatus?: string;
  ticketsSold?: number;
  totalTickets?: number;
};

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

const getTimestamp = (value: string) => {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortRafflesList = (
  raffles: RaffleData[],
  sortBy: RaffleSortOption = "",
) => {
  const nextRaffles = [...raffles];

  if (sortBy === "most-recent") {
    return nextRaffles.sort(
      (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt),
    );
  }

  if (sortBy === "ending-soon") {
    return nextRaffles.sort(
      (a, b) => getTimestamp(a.endDate) - getTimestamp(b.endDate),
    );
  }

  if (sortBy === "price") {
    return nextRaffles.sort(
      (a, b) => Number(a.ticketPrice || 0) - Number(b.ticketPrice || 0),
    );
  }

  if (sortBy === "tickets-sold") {
    return nextRaffles.sort(
      (a, b) => Number(b.ticketsSold || 0) - Number(a.ticketsSold || 0),
    );
  }

  return nextRaffles.sort((a, b) => {
    const aFeatured = Boolean(a.raffle_detail?.isFeatured);
    const bFeatured = Boolean(b.raffle_detail?.isFeatured);

    if (aFeatured !== bFeatured) {
      return aFeatured ? -1 : 1;
    }

    return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
  });
};

export const RaffleGrid = ({ sortBy = "" }: { sortBy?: RaffleSortOption }) => {
  const [raffles, SetRaffles] = useState<RaffleData[]>([]);
  const [endedRaffles, setEndedRaffles] = useState<RaffleData[]>([]);
  const [upcomingRaffles, setUpcomingRaffles] = useState<RaffleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("live");

  // Fetch data for specific tab
  const fetchRafflesForTab = useCallback(
    async (tabStatus: string) => {
      try {
        const endpoint =
          tabStatus === "live"
            ? "/raffle/live"
            : tabStatus === "ended"
              ? "/raffle/ended"
              : "/raffle/upcoming";
        const response = await server.get(endpoint);

        const data = Array.isArray(response.data.data?.formattedRaffles)
          ? response.data.data.formattedRaffles
          : Array.isArray(response.data.data?.raffles)
            ? response.data.data.raffles
            : [];

        // Update the appropriate state based on tab
        if (tabStatus === "live") SetRaffles(data);
        else if (tabStatus === "ended") setEndedRaffles(data);
        else if (tabStatus === "upcoming") setUpcomingRaffles(data);
      } catch (error: unknown) {
        console.error(`Error fetching ${tabStatus} raffles:`, error);

        // Set empty array for failed requests
        if (tabStatus === "live") SetRaffles([]);
        else if (tabStatus === "ended") setEndedRaffles([]);
        else if (tabStatus === "upcoming") setUpcomingRaffles([]);

        const errorMessage =
          error instanceof Error && "response" in error
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message || `Failed to fetch ${tabStatus} raffles`
            : `Failed to fetch ${tabStatus} raffles`;
        toast.error(errorMessage);
      }
    },
    [],
  );

  // Initial load - fetch all tabs
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      await fetchRafflesForTab(activeTab);
      setLoading(false);
    };

    fetchInitial();
  }, [activeTab, fetchRafflesForTab]);

  const liveRaffles = sortRafflesList(raffles, sortBy);
  const endedRaffleList = sortRafflesList(endedRaffles, sortBy);
  const upcomingRaffleList = sortRafflesList(upcomingRaffles, sortBy);

  // Socket.IO integration for real-time updates (separate useEffect to avoid dependency issues)
  useEffect(() => {
    const updateRaffleInList = (
      raffleId: number,
      updateData: RaffleRealtimeUpdate,
      setTargetList: React.Dispatch<React.SetStateAction<RaffleData[]>>,
    ) => {
      setTargetList((prevRaffles) => {
        return prevRaffles.map((raffle) => {
          if (raffle.id === raffleId) {
            return {
              ...raffle,
              ticketsSold:
                updateData.ticketsSold !== undefined
                  ? updateData.ticketsSold
                  : raffle.ticketsSold,
              totalTickets:
                updateData.totalTickets !== undefined
                  ? updateData.totalTickets
                  : raffle.totalTickets,
            };
          }
          return raffle;
        });
      });
    };

    const handleRaffleListUpdate = (data: RaffleRealtimeUpdate) => {
      if (data.raffleId) {
        // Handle new raffle creation
        if (data.action === "raffle_created") {
          if (data.status === "LIVE") {
            fetchRafflesForTab("live");
          } else if (data.status === "UPCOMING") {
            fetchRafflesForTab("upcoming");
          } else if (data.status === "ENDED") {
            fetchRafflesForTab("ended");
          }
        } else {
          updateRaffleInList(data.raffleId, data, SetRaffles);
          updateRaffleInList(data.raffleId, data, setEndedRaffles);
          updateRaffleInList(data.raffleId, data, setUpcomingRaffles);
        }
      }
    };

    const handleTicketPurchase = (data: RaffleRealtimeUpdate) => {
      // console.log("Raffle grid - ticket purchase received:", data);

      if (data.raffleId) {
        // Update the raffle in all relevant lists
        updateRaffleInList(data.raffleId, data, SetRaffles);
        updateRaffleInList(data.raffleId, data, setEndedRaffles);
        updateRaffleInList(data.raffleId, data, setUpcomingRaffles);
      }
    };

    const handleRaffleStatusChange = (data: RaffleRealtimeUpdate) => {
      // console.log("Raffle grid - raffle status change received:", data);

      // if (data.raffleId) {
      // For now, just refresh the data to ensure consistency
      if (data.newStatus === "ENDED") {
        // Raffle moved from live to ended
        fetchRafflesForTab("live");
        fetchRafflesForTab("ended");
        //      }
      }
    };

    // Register Socket.IO event listeners
    socketService.onRaffleListUpdated(handleRaffleListUpdate);
    socketService.onTicketPurchase(handleTicketPurchase);
    socketService.onRaffleStatusChanged(handleRaffleStatusChange);

    // Cleanup event listeners
    return () => {
      socketService.offRaffleListUpdated(handleRaffleListUpdate);
      socketService.offTicketPurchase(handleTicketPurchase);
      socketService.offRaffleStatusChanged(handleRaffleStatusChange);
    };
  }, [fetchRafflesForTab]); // Only depend on fetchRafflesForTab

  const handleTabChange = async (newTab: string) => {
    setActiveTab(newTab);

    const hasData =
      (newTab === "live" && raffles.length > 0) ||
      (newTab === "ended" && endedRaffles.length > 0) ||
      (newTab === "upcoming" && upcomingRaffles.length > 0);

    if (!hasData) {
      setLoading(true);
      await fetchRafflesForTab(newTab);
      setLoading(false);
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="space-y-2 z-20 mt-10"
    >
      <TabsList className="p-1 sm:w-auto">
        <TabsTrigger
          value="live"
          className="gap-2 px-2.5 py-2 text-xs sm:text-sm sm:px-3 sm:py-2 flex-1 sm:flex-none"
        >
          <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
          Live Raffles
        </TabsTrigger>
        <TabsTrigger
          value="ended"
          className="gap-2 px-2.5 py-2 text-xs sm:text-sm sm:px-3 sm:py-2 flex-1 sm:flex-none"
        >
          <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
          Ended Raffles
        </TabsTrigger>
        <TabsTrigger
          value="upcoming"
          className="gap-2 px-2.5 py-2 text-xs sm:text-sm sm:px-3 sm:py-2 flex-1 sm:flex-none"
        >
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
          Upcoming Raffles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="live" className="space-y-6">
        {loading && activeTab === "live" ? (
          <div className="py-16 text-center text-muted-foreground">
            Loading live raffles...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Live Raffles</h2>
              <span className="text-sm text-muted-foreground">
                {Array.isArray(raffles) ? raffles.length : 0} live raffles
              </span>
            </div>
            {Array.isArray(raffles) && raffles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveRaffles.map((raffle) => {
                  const mappedRaffle = {
                    id: raffle.id,
                    title: raffle.title,
                    image: raffle.imageUrl || "/placeholder-raffle.png",
                    price: raffle.ticketPrice,
                    sold: Number(raffle.ticketsSold) || 0,
                    total: Number(raffle.totalTickets) || 0,
                    tokenType: raffle.tokenType,
                    tokenAddress: raffle.tokenAddress,
                    winners: raffle.numberOfWinners,
                    endTime: formatCountdown(raffle.endDate),
                    isVerified:
                      raffle.raffle_detail?.requiresNftVerification || false,
                    isFeatured: raffle.raffle_detail?.isFeatured || false,
                  };

                  return (
                    <Link to={`/raffle/raffle-${raffle.id}`} key={raffle.id}>
                      <RaffleCard {...mappedRaffle} />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 ">
                <Flame className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">
                  No Live Raffles Yet
                </h3>
                <p className="text-muted-foreground">
                  Completed raffles will appear here
                </p>
              </div>
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="ended" className="space-y-6">
        {loading && activeTab === "ended" ? (
          <div className="py-16 text-center text-muted-foreground">
            Loading ended raffles...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Ended Raffles</h2>
              <span className="text-sm text-muted-foreground">
                {Array.isArray(endedRaffles) ? endedRaffles.length : 0} ended
                raffles
              </span>
            </div>
            {Array.isArray(endedRaffles) && endedRaffles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">
                {endedRaffleList.map((raffle) => {
                  const mappedRaffle = {
                    id: raffle.id,
                    title: raffle.title,
                    image: raffle.imageUrl || "/placeholder-raffle.png",
                    price: raffle.ticketPrice,
                    sold: Number(raffle.ticketsSold) || 0,
                    total: Number(raffle.totalTickets) || 0,
                    tokenType: raffle.tokenType,
                    tokenAddress: raffle.tokenAddress,
                    winners: raffle.numberOfWinners,
                    endTime: formatCountdown(raffle.endDate),
                    isVerified:
                      raffle.raffle_detail?.requiresNftVerification || false,
                    isFeatured: raffle.raffle_detail?.isFeatured || false,
                  };

                  return (
                    <Link to={`/raffle/raffle-${raffle.id}`} key={raffle.id}>
                      <RaffleCard {...mappedRaffle} />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 ">
                <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">
                  No Ended Raffles Yet
                </h3>
                <p className="text-muted-foreground">
                  Completed raffles will appear here
                </p>
              </div>
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="upcoming" className="space-y-6">
        {loading && activeTab === "upcoming" ? (
          <div className="py-16 text-center text-muted-foreground">
            Loading upcoming raffles...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Upcoming Raffles</h2>
              <span className="text-sm text-muted-foreground">
                {Array.isArray(upcomingRaffles) ? upcomingRaffles.length : 0}{" "}
                upcoming raffles
              </span>
            </div>
            {Array.isArray(upcomingRaffles) && upcomingRaffles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingRaffleList.map((raffle) => {
                  const mappedRaffle = {
                    id: raffle.id,
                    title: raffle.title,
                    image: raffle.imageUrl || "/placeholder-raffle.png",
                    price: raffle.ticketPrice,
                    sold: Number(raffle.ticketsSold) || 0,
                    total: Number(raffle.totalTickets) || 0,
                    tokenType: getTokenSymbol(
                      raffle.tokenType,
                      raffle.tokenAddress,
                    ),
                    winners: raffle.numberOfWinners,
                    endTime: formatCountdown(raffle.endDate),
                    isVerified:
                      raffle.raffle_detail?.requiresNftVerification || false,
                    isFeatured: raffle.raffle_detail?.isFeatured || false,
                  };

                  return (
                    <Link to={`/raffle/raffle-${raffle.id}`} key={raffle.id}>
                      <RaffleCard {...mappedRaffle} />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 ">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">
                  No Upcoming Raffles Yet
                </h3>
                <p className="text-muted-foreground">
                  Upcoming raffles will appear here
                </p>
              </div>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
};
