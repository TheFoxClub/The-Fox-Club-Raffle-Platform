import { Card } from "../../components/ui/Card";
import {
  Trophy,
  TrendingUp,
  User,
  Coins,
  Award,
  Crown,
  Medal,
  Star,
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/Tabs";

import { useState, useEffect } from "react";
import server from "../../config/server";
import XPLeaderboard from "./XPLeaderboard";
import { toast } from "react-toastify";

const Leaderboard = () => {
  const [topHosts, setTopHosts] = useState<any[]>([]);
  const [topBuyers, setTopBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await server.get("/admin/leaderboard");
        const json = res.data;

        if (json.success) {
          const formatToken = (token: string) => {
            if (token === "SOLANA") return "SOL";
            //     if (token === "USDC") return "USDC";
            return token; // fallback
          };

          const shortenWallet = (wallet: string) => {
            if (!wallet) return "";
            return wallet.slice(0, 4) + "..." + wallet.slice(-4);
          };

          const mappedHosts = json.data.topHosts.map((host: any) => ({
            rank: host.rank,
            walletAddress: host.walletAddress,
            walletShort: shortenWallet(host.walletAddress),
            revenue: host.totalRevenue,
            raffles: host.rafflesCount,
            tokenType: formatToken(host.tokenType),
            badge: host.rank === 1 ? "crown" : undefined,
            //    reputation: 0,
          }));
          const mappedBuyers = json.data.topBuyers.map((buyer: any) => ({
            rank: buyer.rank,
            walletAddress: buyer.walletAddress,
            walletShort: shortenWallet(buyer.walletAddress),
            spent: buyer.totalSpent,
            tickets: buyer.ticketsBought,
            wins: buyer.totalWins,
            tokenType: formatToken(buyer.tokenType),
            badge: buyer.rank === 1 ? "crown" : undefined,
          }));

          setTopHosts(mappedHosts);
          setTopBuyers(mappedBuyers);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number, badge?: string) => {
    if (badge === "crown") {
      return <Crown className="h-6 w-6 text-yellow-500" />;
    } else if (rank === 2) {
      return <Medal className="h-6 w-6 text-slate-300" />;
    } else if (rank === 3) {
      return <Medal className="h-6 w-6 text-amber-600" />;
    }
    return (
      <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
    );
  };

  const getRankCardClass = (rank: number) => {
    if (rank === 1) return " border-yellow-500/50 glow-accent";
    if (rank === 2) return " border-slate-300/50";
    if (rank === 3) return " border-amber-600/50";
    return "";
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
    }
  };

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-12 w-12 text-accent" />
            <h1 className="text-5xl font-bold text-gradient">Leaderboard</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Compete for the top spot and earn exclusive rewards
          </p>
        </div>

        <Tabs defaultValue="hosts" className="space-y-6 my-4">
          <TabsList className=" p-1 w-full sm:w-auto">
            <TabsTrigger value="hosts" className="gap-2 flex-1 sm:flex-none">
              <TrendingUp className="h-4 w-4" />
              Top Hosts
            </TabsTrigger>
            <TabsTrigger value="buyers" className="gap-2 flex-1 sm:flex-none">
              <User className="h-4 w-4" />
              Top Buyers
            </TabsTrigger>
            <TabsTrigger value="xp" className="gap-2 flex-1 sm:flex-none">
              <Star className="h-4 w-4" />
              XP Leaders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hosts" className="space-y-4">
            <Card className="bg-card p-6">
              <div className="flex mb-6 items-center gap-2">
                <TrendingUp className="h-6 w-6 text-accent" />
                <p className="font-bold text-2xl">Top Hosts by Revenue</p>
              </div>

              {loading ? (
                <p className="text-center text-muted-foreground py-10">
                  Loading leaderboard...
                </p>
              ) : topHosts.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">
                  No data available.
                </p>
              ) : (
                <div className="space-y-3">
                  {topHosts.map((host) => (
                    <Card
                      key={host.rank}
                      className={`${getRankCardClass(host.rank)} p-4 bg-card`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-12">
                            {getRankIcon(host.rank, host.badge)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <button
                                onClick={() =>
                                  copyToClipboard(host.walletAddress)
                                }
                                className="font-bold text-lg truncate text-left hover:text-primary transition cursor-pointer"
                                title="Click to copy wallet address"
                              >
                                {host.walletShort}
                              </button>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              {host.raffles} raffles hosted
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <Coins className="h-5 w-5 text-accent" />
                            <p className="font-bold text-xl">{host.revenue}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {host.tokenType} earned
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="buyers" className="space-y-4">
            <Card className="bg-card p-6">
              <div className="flex mb-6 items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                <p className="font-bold text-2xl">Top Buyers by Spending</p>
              </div>

              {loading ? (
                <p className="text-center text-muted-foreground py-10">
                  Loading leaderboard...
                </p>
              ) : topBuyers.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">
                  No data available.
                </p>
              ) : (
                <div className="space-y-3">
                  {topBuyers.map((buyer) => (
                    <Card
                      key={buyer.rank}
                      className={`${getRankCardClass(buyer.rank)} bg-card p-4`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-12">
                            {getRankIcon(buyer.rank, buyer.badge)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() =>
                                copyToClipboard(buyer.walletAddress)
                              }
                              className="font-bold text-lg mb-1 truncate text-left
             hover:text-primary
             transition cursor-pointer"
                              title="Click to copy wallet address"
                            >
                              {buyer.walletShort}
                            </button>

                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{buyer.tickets} tickets</span>
                              <span>.</span>
                              <span className="flex items-center gap-1">
                                <Trophy className="h-3 w-3 text-accent" />
                                {buyer.wins} wins
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <Coins className="h-5 w-5 text-accent" />
                            <p className="font-bold text-xl">{buyer.spent}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {buyer.tokenType} spent
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="xp" className="space-y-4">
            <XPLeaderboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
