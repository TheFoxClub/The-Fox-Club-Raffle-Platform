import { Download, Send, TrendingUp } from "lucide-react";
import Button  from "../../components/ui/Button";
import  {Progress}  from "../../components/ui/Progress";
import { Switch } from "../../components/ui/Switch";
import { Label } from "../../components/ui/Label";
import { useToast } from "../../hooks/use-toast";

const topHosts = [
  { wallet: "7XYZ...abc1", volume: "1,245 SOL", rank: 1 },
  { wallet: "8ABC...def2", volume: "987 SOL", rank: 2 },
  { wallet: "9DEF...ghi3", volume: "756 SOL", rank: 3 },
];

const topBuyers = [
  { wallet: "4GHI...jkl4", spending: "2,345 SOL", rank: 1 },
  { wallet: "5JKL...mno5", spending: "1,876 SOL", rank: 2 },
  { wallet: "6MNO...pqr6", spending: "1,543 SOL", rank: 3 },
];

export default function AdminRewards() {
  const { toast } = useToast();

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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Reward Pool Status */}
      <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Reward Pool</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Current accumulated rewards</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl sm:text-3xl font-bold text-gradient">124.5 SOL</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Available for distribution</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span>Pool Progress</span>
              <span className="text-muted-foreground">83% to target</span>
            </div>
            <Progress value={83} className="h-2" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border/30 gap-3">
            <div className="flex items-center gap-3">
              <Switch id="auto-airdrop" defaultChecked />
              <Label htmlFor="auto-airdrop" className="cursor-pointer text-xs sm:text-sm">
                Auto Airdrop (Month-end)
              </Label>
            </div>
            <Button className="gradient-primary w-full sm:w-auto" onClick={handleAirdrop}>
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
            <Button variant="outline" size="sm" onClick={() => handleExport("hosts")} className="w-full sm:w-auto">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {topHosts.map((host) => (
              <div
                key={host.wallet}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-card/50 border border-border/30"
              >
                <div
                  className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg shrink-0 ${
                    host.rank === 1
                      ? "bg-gradient-primary text-white"
                      : host.rank === 2
                      ? "bg-secondary/20 text-secondary"
                      : "bg-accent/20 text-accent"
                  }`}
                >
                  {host.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-base truncate">{host.wallet}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Volume</p>
                </div>
                <p className="font-bold text-primary text-xs sm:text-base whitespace-nowrap">{host.volume}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Buyers */}
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              Top Buyers
            </h3>
            <Button variant="outline" size="sm" onClick={() => handleExport("buyers")} className="w-full sm:w-auto">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {topBuyers.map((buyer) => (
              <div
                key={buyer.wallet}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-card/50 border border-border/30"
              >
                <div
                  className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg shrink-0 ${
                    buyer.rank === 1
                      ? "bg-gradient-primary text-white"
                      : buyer.rank === 2
                      ? "bg-secondary/20 text-secondary"
                      : "bg-accent/20 text-accent"
                  }`}
                >
                  {buyer.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-base truncate">{buyer.wallet}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Spending</p>
                </div>
                <p className="font-bold text-accent text-xs sm:text-base whitespace-nowrap">{buyer.spending}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
