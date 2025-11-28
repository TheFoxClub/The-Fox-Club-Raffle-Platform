import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Progress } from "../../components/ui/Progress";
import Button from "../../components/ui/Button";
import {
  Clock,
  Users,
  Coins,
  CheckCircle,
  User,
  Calendar,
  Trophy,
  Ticket,
  AlertCircle,
} from "lucide-react";
// import { allRaffle } from "../../dummydata/mockRaffleDetail";
// import type { RaffleType } from "../../dummydata/mockRaffleDetail";
import server from "../../config/server";
import { toast } from "react-toastify";

export interface RaffleType {
  id: number;
  title: string;
  description: string;
  image: string;
  price: number;
  tokenType: string;
  total: number;
  sold: number;
  winners: number;
  endTime: string;
  created: string;
  host: string;
  hostReputation: number;
  isVerified: boolean;
  isFeatured: boolean;
  prizeValue: string;
}

function formatDateOnly(dateStr: string) {
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
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

  const minutes = Math.floor(diff / (1000 * 60));

  return `${days}d ${hours}h ${minutes}m`;
}

const RaffleDetail = () => {
  const { id } = useParams<{ id: string }>();

  const [raffle, setRaffle] = useState<RaffleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(1);
  const TOKEN_MAP: Record<number, string> = {
    0: "SOL",
    1: "USDC",
    2: "BONK",
    3: "USDT",
  };

  useEffect(() => {
    // simulate fetching raffle data
    const fetchRaffle = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await server.get(`/raffle/${id}`);
        if (res.data.success) {
          const data = res.data.data.raffle;

          const mappedRaffle: RaffleType = {
            id: data.id,
            title: data.title,
            description: data.description,
            image: data.imageUrl,
            price: Number(data.ticketPrice),
            tokenType: TOKEN_MAP[data.tokenType] || "UNKNOWN",
            total: data.totalTickets,
            sold: data.ticketsSold,
            winners: data.numberOfWinners,
            endTime: formatCountdown(data.endDate),
            created: formatDateOnly(data.createdAt),
            host: data.userName || "Admin",
            hostReputation: data.userReputation || 100,
            isVerified: data.raffle_detail.requiresNftVerification,
            isFeatured: data.raffle_detail.isFeatured,
            prizeValue: (data.ticketPrice * data.totalTickets).toFixed(2),
          };

          setRaffle(mappedRaffle);
        } else {
          toast.error(res.data.message || "Failed to fetch raffle");
        }
      } catch (error: any) {
        console.error(error);
        toast.error(error.response?.data?.message || "Failed to fetch raffle");
      } finally {
        setLoading(false);
      }
    };
    fetchRaffle();
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading raffle details...
      </div>
    );

  if (!raffle)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Raffle not found.
      </div>
    );

  const ticketsLeft = Math.max(raffle.total - raffle.sold, 0);
  const totalCost = (raffle.price * ticketCount).toFixed(2);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card overflow-hidden">
            <div className="relative aspect-video">
              <img
                src={raffle.image}
                alt={raffle.title}
                className="w-full h-full object-cover"
              />
              {raffle.isVerified && (
                <div className="absolute top-4 right-4 bg-green-900/30 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                  <CheckCircle size={16} /> Verified Collection
                </div>
              )}
            </div>
          </Card>

          {/* Raffle Info */}
          <Card className="glass-card p-6 space-y-4">
            <div>
              <div className="top-3 left-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white mb-3">
                Featured Raffle
              </div>
              <h1 className="text-3xl font-bold mb-4 text-gradient">
                {raffle.title}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                {raffle.description}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Trophy className="h-4 w-4" />
                  Prize Value
                </div>
                <p className="font-bold text-lg">~{raffle.prizeValue}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Users className="h-4 w-4" />
                  Winners
                </div>
                <p className="font-bold text-lg">{raffle.winners}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="h-4 w-4" />
                  Created
                </div>
                <p className="font-bold text-lg">{raffle.created}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <User className="h-4 w-4" />
                  Reputation
                </div>
                <p className="font-bold text-lg">{raffle.hostReputation}%</p>
              </div>
            </div>
          </Card>

          {/* Host Section */}
          <Card className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-bold mb-4">Hosted By</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-primarmrounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">{raffle.host}</p>
                  <p className="text-sm text-muted-foreground">
                    {raffle.hostReputation}% positive rating
                  </p>
                </div>
              </div>
              <Button variant="outline">View Profile</Button>
            </div>
          </Card>
        </div>

        {/* RIGHT SIDE (Sidebar) */}
        <div className="lg:col-span-1">
          <Card className="glass-card p-6 space-y-4 sticky top-24">
            <div>
              <h3 className="text-xl font-bold mb-4">Enter Raffle</h3>
            </div>
            {/* Ticket Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted foreground" />
                  <span className="text-sm text-muted-foreground">
                    {raffle.sold} / {raffle.total} tickets sold
                  </span>
                </div>

                <span className="text-accent font-semibold">
                  {ticketsLeft} left
                </span>
              </div>
              <Progress
                value={(raffle.sold / raffle.total) * 100}
                className="h-3"
              />
            </div>

            {/* Ticket Price */}
            <div className="flex items-center justify-between glass-card p-4 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-accent" />
                <span className="text-muted-foreground">Ticket Price</span>
              </div>
              <span className="text-xl font-bold">
                {raffle.price} {raffle.tokenType}
              </span>
            </div>

            {/* remaining time */}

            <div className="flex items-center justify-between glass-card p-4 rounded-lg mb-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Ends In</span>
              </div>
              <span className="text-muted-foreground text-xl font-bold">
                {raffle.endTime}
              </span>
            </div>

            {/* Countdown */}

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                Number of Tickets
              </label>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  className="bg-background-50"
                  size="icon"
                  onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                >
                  -
                </Button>
                <input
                  type="number"
                  value={ticketCount}
                  onChange={(e) =>
                    setTicketCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="flex h-10 w-full rounded-md text-center border border-border bg-background-50 rounded-md text-lg p-2 font-bold md:text-sm"
                />
                <Button
                  variant="outline"
                  className="bg-background-50"
                  size="icon"
                  onClick={() => setTicketCount(ticketCount + 1)}
                >
                  +
                </Button>
              </div>
            </div>
            {/* Total Cost */}
            <div className="flex items-center glass-card justify-between border-primary-30 p-4 rounded-lg bg-primary-10">
              <span className="font-semibold text-muted-foreground">
                Total Cost
              </span>
              <span className="text-2xl font-bold text-primary">
                {totalCost} {raffle.tokenType}
              </span>
            </div>

            {/* Buy Button */}
            <Button className="w-full mt-4 gradient-primary glow-primary h-12 text-lg">
              <Ticket className="h-5 w-5 mr-2" />
              Buy {ticketCount} Ticket{ticketCount > 1 ? "s" : ""}
            </Button>

            {/* Info */}
            <div className="glass-card border-accent-30 rounded-lg flex gap-3 p-4">
              <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold">NFT Holder Discount</p>
                <p className="text-muted-foreground">
                  Connet a wallet with verified NFTs to get 2.5% fees instead of
                  5%
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default RaffleDetail;
