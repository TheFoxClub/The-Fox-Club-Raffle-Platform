import { useEffect, useState } from "react";
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
import card1 from "../../../public/assets/card1.jpg";

const RaffleDetail = () => {
  const id = 1;
  // Mock data for the raffle
  interface RaffleType {
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

  const allRaffle = [
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

  const [raffle, setRaffle] = useState<RaffleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(1);

  useEffect(() => {
    // simulate fetching raffle data
    const fetchRaffle = async () => {
      // Replace this with API call if needed
      const data = allRaffle.find((item) => item.id === id) || null;
      setRaffle(data);
      setLoading(false);
    };

    fetchRaffle();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading raffle details...</p>
      </div>
    );
  }

  if (!raffle) {
    return <div>Loading raffle...</div>;
  }

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
                <p className="font-bold text-lg">{raffle.prizeValue}</p>
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
                    {" "}
                    {raffle.sold} / {raffle.total} tickets sold
                  </span>
                </div>

                <span className="text-accent font-semibold">
                  {raffle.total - raffle.sold} left
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
                <span className="text-sm text-muted-foreground">
                  Ticket Price
                </span>
              </div>
              <span className="text-muted-foreground text-xl font-bold">
                {raffle.price} {raffle.tokenType}
              </span>
            </div>

            {/* remaining time */}

            <div className="flex items-center justify-between glass-card p-4 rounded-lg mb-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Ends In</span>
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
                {(raffle.price * ticketCount).toFixed(2)} {raffle.tokenType}
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
