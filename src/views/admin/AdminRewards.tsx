import { Download, Send, TrendingUp } from "lucide-react";
import Button from "../../components/ui/Button";
import { Progress } from "../../components/ui/Progress";
import { Switch } from "../../components/ui/Switch";
import { Label } from "../../components/ui/Label";
import { useToast } from "../../hooks/use-toast";
import { useState, useEffect } from "react";
import server from "../../config/server";

export default function AdminRewards() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const rewardPool = 0;
  const poolProgress = 0;
  const [topHosts, setTopHosts] = useState<any[]>([]);
  const [topBuyers, setTopBuyers] = useState<any[]>([]);

  const shortWallet = (wallet: string) =>
    wallet.slice(0, 4) + "..." + wallet.slice(-4);

  const formatAmount = (amount: number, tokenType: string) => {
    if (amount === null || amount === undefined) return `0 ${tokenType}`;

    const TOKEN_LABELS: Record<string, string> = {
      SOLANA: "SOL",
      USDC: "USDC",
    };

    return `${amount} ${TOKEN_LABELS[tokenType] ?? tokenType}`;
  };

  const handleExport = (type: string) => {
    toast({
      title: "✅ Export Started",
      description: `Exporting ${type} data to CSV...`,
    });
  };

  const handleAirdrop = () => {
    toast({
      title: "🎁 Airdrop Triggered",
      description: "Rewards are being distributed to top users",
    });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await server.get("/admin/leaderboard");
        const { topHosts, topBuyers } = res.data.data;

        setTopHosts(topHosts);
        setTopBuyers(topBuyers);
      } catch (error) {
        console.error("Error fetching top hosts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  if (loading) return <p>Loading rewards dashboard...</p>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Reward Pool Status */}
      <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold">Reward Pool</h2>
            <p className="text-sm text-muted-foreground">
              Current accumulated rewards
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gradient">{rewardPool} SOL</p>
            <p className="text-sm text-muted-foreground">
              Available for distribution
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span>Pool Progress</span>
              <span className="text-muted-foreground">
                {poolProgress}% to target
              </span>
            </div>
            <Progress value={poolProgress} className="h-2" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border/30 gap-3">
            <div className="flex items-center gap-3">
              <Switch id="auto-airdrop" defaultChecked />
              <Label
                htmlFor="auto-airdrop"
                className="cursor-pointer text-xs sm:text-sm"
              >
                Auto Airdrop (Month-end)
              </Label>
            </div>
            <Button
              className="gradient-primary w-full sm:w-auto"
              onClick={handleAirdrop}
            >
              <Send className="h-4 w-4 mr-2" />
              Trigger Airdrop Now
            </Button>
          </div>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Hosts */}
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Top Hosts
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("hosts")}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>

          <div className="space-y-4">
            {topHosts.length > 0 ? (
              topHosts.map((host) => (
                <div
                  key={host.walletAddress}
                  className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border/30"
                >
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      host.rank === 1
                        ? "bg-gradient-primary text-white"
                        : host.rank === 2
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {host.rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {shortWallet(host.walletAddress)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Volume
                    </p>
                  </div>
                  <p className="font-bold text-primary">
                    {formatAmount(host.totalRevenue, host.tokenType)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">
                No top hosts available yet.
              </p>
            )}
          </div>
        </div>

        {/* Top Buyers */}
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              Top Buyers
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("buyers")}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>

          <div className="space-y-4">
            {topBuyers.length > 0 ? (
              topBuyers.map((buyer) => (
                <div
                  key={buyer.walletAddress}
                  className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border/30"
                >
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      buyer.rank === 1
                        ? "bg-gradient-primary text-white"
                        : buyer.rank === 2
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {buyer.rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {shortWallet(buyer.walletAddress)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Spending
                    </p>
                  </div>
                  <p className="font-bold text-accent">
                    {formatAmount(buyer.totalSpent, buyer.tokenType)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">
                No top buyers available yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
