import { useState } from "react";
import { Trophy, Download, RotateCcw } from "lucide-react";
import Button from "../../components/ui/Button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/Tabs";
import { useToast } from "../../hooks/use-toast";
import { useEffect } from "react";

// const topHosts = [
//   { wallet: "7XYZ...abc1", revenue: "1,245 SOL", raffles: 45, xp: 12450, streak: 15 },
//   { wallet: "8ABC...def2", revenue: "987 SOL", raffles: 38, xp: 9870, streak: 12 },
//   { wallet: "9DEF...ghi3", revenue: "756 SOL", raffles: 32, xp: 7560, streak: 8 },
//   { wallet: "4GHI...jkl4", revenue: "645 SOL", raffles: 28, xp: 6450, streak: 10 },
//   { wallet: "5JKL...mno5", revenue: "534 SOL", raffles: 24, xp: 5340, streak: 6 },
// ];

// const topBuyers = [
//   { wallet: "4GHI...jkl4", spending: "2,345 SOL", tickets: 489, xp: 23450, streak: 20 },
//   { wallet: "5JKL...mno5", spending: "1,876 SOL", tickets: 378, xp: 18760, streak: 18 },
//   { wallet: "6MNO...pqr6", spending: "1,543 SOL", tickets: 312, xp: 15430, streak: 15 },
//   { wallet: "7PQR...stu7", spending: "1,234 SOL", tickets: 256, xp: 12340, streak: 12 },
//   { wallet: "8STU...vwx8", spending: "987 SOL", tickets: 198, xp: 9870, streak: 9 },
// ];

export default function AdminLeaderboards() {
  const [activeTab, setActiveTab] = useState("hosts");
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const topHosts: any[] = []; // fallback empty
  const topBuyers: any[] = []; // fallback empty

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <p>Loading leaderboards...</p>;
  const handleExport = () => {
    toast({
      title: "✅ Export Started",
      description: `Exporting ${activeTab} leaderboard data...`,
    });
  };

  const handleReset = () => {
    toast({
      title: "⚠️ Reset Leaderboard",
      description: "Are you sure? This action cannot be undone.",
      variant: "destructive",
    });
  };

  return (
    <div className="w-84 md:w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center mb-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leaderboards</h2>
          <p className="text-muted-foreground">
            View and manage top performing users
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="destructive" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="hosts">Top Hosts</TabsTrigger>
          <TabsTrigger value="buyers">Top Buyers</TabsTrigger>
        </TabsList>

        <TabsContent value="hosts" className="mt-6">
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border/50">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Rank</th>
                    <th className="p-4 font-medium">Wallet</th>
                    <th className="p-4 font-medium">Total Revenue</th>
                    <th className="p-4 font-medium">Raffles</th>
                    <th className="p-4 font-medium">XP</th>
                    <th className="p-4 font-medium">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {topHosts.length > 0 ? (
                    topHosts.map((host, index) => (
                      <tr
                        key={host.wallet}
                        className="border-b border-border/30 hover:bg-muted/20"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                                index === 0
                                  ? "bg-gradient-primary text-white"
                                  : index === 1
                                  ? "bg-secondary/20 text-secondary"
                                  : index === 2
                                  ? "bg-accent/20 text-accent"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {index + 1}
                            </div>
                            {index < 3 && (
                              <Trophy className="h-4 w-4 text-accent" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-medium">{host.wallet}</td>
                        <td className="p-4 text-primary font-bold">
                          {host.revenue}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {host.raffles}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium">
                            {host.xp.toLocaleString()} XP
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-accent font-medium">
                            🔥 {host.streak} days
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-muted-foreground p-4"
                      >
                        No top hosts available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="buyers" className="mt-6">
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border/50">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Rank</th>
                    <th className="p-4 font-medium">Wallet</th>
                    <th className="p-4 font-medium">Total Spending</th>
                    <th className="p-4 font-medium">Tickets</th>
                    <th className="p-4 font-medium">XP</th>
                    <th className="p-4 font-medium">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {topBuyers.length > 0 ? (
                    topBuyers.map((buyer, index) => (
                      <tr
                        key={buyer.wallet}
                        className="border-b border-border/30 hover:bg-muted/20"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                                index === 0
                                  ? "bg-gradient-primary text-white"
                                  : index === 1
                                  ? "bg-secondary/20 text-secondary"
                                  : index === 2
                                  ? "bg-accent/20 text-accent"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {index + 1}
                            </div>
                            {index < 3 && (
                              <Trophy className="h-4 w-4 text-accent" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-medium">{buyer.wallet}</td>
                        <td className="p-4 text-accent font-bold">
                          {buyer.spending}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {buyer.tickets}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-md bg-accent/10 text-accent text-sm font-medium">
                            {buyer.xp.toLocaleString()} XP
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-accent font-medium">
                            🔥 {buyer.streak} days
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-muted-foreground p-4"
                      >
                        No top buyers available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
