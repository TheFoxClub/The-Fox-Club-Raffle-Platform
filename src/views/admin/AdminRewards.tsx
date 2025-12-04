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
    <div className="space-y-6">
      {/* Reward Pool Status */}
      <div className="glass-card p-6 rounded-xl border border-border/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Reward Pool</h2>
            <p className="text-sm text-muted-foreground">Current accumulated rewards</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gradient">124.5 SOL</p>
            <p className="text-sm text-muted-foreground">Available for distribution</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Pool Progress</span>
              <span className="text-muted-foreground">83% to target</span>
            </div>
            <Progress value={83} className="h-2" />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <div className="flex items-center gap-3">
              <Switch id="auto-airdrop" defaultChecked />
              <Label htmlFor="auto-airdrop" className="cursor-pointer">
                Auto Airdrop (Month-end)
              </Label>
            </div>
            <Button className="gradient-primary" onClick={handleAirdrop}>
              <Send className="h-4 w-4 mr-2" />
              Trigger Airdrop Now
            </Button>
          </div>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Hosts */}
        <div className="glass-card p-6 rounded-xl border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Hosts
            </h3>
            <Button variant="outline" size="sm" onClick={() => handleExport("hosts")}>
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>

          <div className="space-y-4">
            {topHosts.map((host) => (
              <div
                key={host.wallet}
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
                  <p className="font-medium">{host.wallet}</p>
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                </div>
                <p className="font-bold text-primary">{host.volume}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Buyers */}
        <div className="glass-card p-6 rounded-xl border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Top Buyers
            </h3>
            <Button variant="outline" size="sm" onClick={() => handleExport("buyers")}>
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>

          <div className="space-y-4">
            {topBuyers.map((buyer) => (
              <div
                key={buyer.wallet}
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
                  <p className="font-medium">{buyer.wallet}</p>
                  <p className="text-sm text-muted-foreground">Total Spending</p>
                </div>
                <p className="font-bold text-accent">{buyer.spending}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
