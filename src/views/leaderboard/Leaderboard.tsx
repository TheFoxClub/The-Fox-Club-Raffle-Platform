import { Card } from "../../components/ui/Card";
import {
  Trophy,
  TrendingUp,
  User,
  Coins,
  Award,
  Crown,
  Medal,
} from "lucide-react";
import Select from "../../components/ui/Select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/Tabs";
import { topHosts, topBuyers } from "../../dummydata/topHostsBuyers";
import { useState } from "react";

const Leaderboard = () => {
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
    if (rank === 1) return "glass-card border-yellow-500/50 glow-accent";
    if (rank === 2) return "glass-card border-slate-300/50";
    if (rank === 3) return "glass-card border-amber-600/50";
    return "glass-card";
  };

  const timeOptions = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "alltime", label: "All Time" },
  ];

  const [selectedTime, setSelectedTime] = useState("monthly");

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

        <Card className="glass-card p-6 border border-accent/30 rounded-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Award className="h-10 w-10 text-accent" />
              <div>
                <h3 className="text-lg font-bold">Monthly Rewards</h3>
                <p className="text-muted-foreground text-sm">
                  Top 10 players receive exclusive airdrops and bonuses
                </p>
              </div>
            </div>
            <Select
              options={timeOptions}
              value={selectedTime}
              onValueChange={setSelectedTime}
              className="bg-background-50 mr-6"
            />
          </div>
        </Card>

        <Tabs defaultValue="hosts" className="space-y-2 mt-10">
          <TabsList className="glass-card p-1 w-full sm:w-auto">
            <TabsTrigger value="hosts" className="gap-2 flex-1 sm:flex-none">
              <TrendingUp className="h-4 w-4" />
              Top Hosts
            </TabsTrigger>
            <TabsTrigger value="buyers" className="gap-2 flex-1 sm:flex-none">
              <User className="h-4 w-4" />
              Top Buyers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hosts" className="space-y-4">
            <Card className="glass-card p-6">
              <div className="flex mb-6 items-center gap-2">
                <TrendingUp className="h-6 w-6 text-accent" />
                <p className="font-bold text-2xl">Top Hosts by Revenue</p>
              </div>

              <div className="space-y-3">
                {topHosts.map((host) => (
                  <Card
                    key={host.rank}
                    className={`${getRankCardClass(host.rank)} p-4`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-12">
                          {getRankIcon(host.rank, host.badge)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-lg truncate">
                              {host.wallet}
                            </p>
                            {host.reputation >= 97 && (
                              <div className="top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white w-fit">
                                {host.reputation}% rep
                              </div>
                            )}
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
                          SOL earned
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="buyers" className="space-y-4">
            <Card className="glass-card p-6">
              <div className="flex mb-6 items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                <p className="font-bold text-2xl">Top Buyers by Spending</p>
              </div>

              <div className="space-y-3">
                {topBuyers.map((buyer) => (
                  <Card
                    key={buyer.rank}
                    className={`${getRankCardClass(buyer.rank)} p-4`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-12">
                          {getRankIcon(buyer.rank, buyer.badge)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg mb-1 truncate">
                            {buyer.wallet}
                          </p>
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
                          SOL spent
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
