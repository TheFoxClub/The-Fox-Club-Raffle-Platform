import {
  Download,
  Send,
  TrendingUp,
  Upload,
  Trash2,
  Plus,
  Copy,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { Progress } from "../../components/ui/Progress";
import { Switch } from "../../components/ui/Switch";
import { Label } from "../../components/ui/Label";
//import { useToast } from "../../hooks/use-toast";
import { useState, useEffect } from "react";
import server from "../../config/server";
import { toast } from "react-toastify";

export default function AdminRewards() {
  // const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const rewardPool = 0;
  const poolProgress = 0;
  const [topHosts, setTopHosts] = useState<any[]>([]);
  const [topBuyers, setTopBuyers] = useState<any[]>([]);

  const [walletInput, setWalletInput] = useState("");
  // const [eligibleWallets, setEligibleWallets] = useState<string[]>([]);
  const [eligibleWallets, setEligibleWallets] = useState<string[]>([
    "0xA1B2C3D4E5F6",
    "0x1234567890AB",
    "0xFEDCBA987654",
    "0x0A1B2C3D4E5F",
    "0xABCDE12345FA",
    "0x98765FEDCBA0",
    "0x112233445566",
    "0xAABBCCDDEEFF",
  ]);

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
    // toast({
    //   title: "✅ Export Started",
    //   description: `Exporting ${type} data to CSV...`,
    // });
    toast.info(`Exporting ${type} data to CSV...`);
  };

  const handleAirdrop = () => {
    // toast({
    //   title: "🎁 Airdrop Triggered",
    //   description: "Rewards are being distributed to top users",
    // });
    toast.success("Airdrop triggered successfully");
  };

  const handleAddWallet = () => {
    if (!walletInput) return;

    setEligibleWallets([walletInput, ...eligibleWallets]);
    toast.success("Wallet added successfully");
    setWalletInput("");
  };

  const handleDeleteWallet = () => {
    if (!walletInput) return;

    setEligibleWallets(eligibleWallets.filter((w) => w !== walletInput));
    toast.warn("Wallet removed");
    setWalletInput("");
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];

    toast.success(`CSV uploaded: ${file.name}`);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
    }
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

      {/* Eligible Wallets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
          <h2 className="text-xl font-bold">Add or Remove Wallets</h2>
          <div className="flex flex-col justify-center h-full gap-3">
            <input
              type="text"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="Enter wallet address"
              className="border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring=primary"
            />
            <div className="flex gap-2 mb-4">
              <Button
                onClick={handleAddWallet}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Wallet
              </Button>
              <Button
                onClick={handleDeleteWallet}
                variant="destructive"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Wallet
              </Button>
            </div>

            <label className="cursor-pointer w-full border border-dashed rounded-lg p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/10">
              <Upload className="h-4 w-4" /> Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a CSV with one wallet per row
            </p>
          </div>
        </div>

        {/* Right: Scrollable wallet list */}
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50 max-h-80 flex flex-col overflow-y-auto">
          <h2 className="text-base font-semibold mb-2 sticky top-0 bg-card z-10 p-1">
            Current Eligible Wallets
          </h2>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted/50">
            {eligibleWallets.length > 0 ? (
              eligibleWallets.map((wallet, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 mb-1 rounded bg-card/50 border border-border/20"
                >
                  <span className="font-mono text-sm">{wallet}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                No wallets added yet
              </p>
            )}
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
                    <button
                      onClick={() => copyToClipboard(host.walletAddress)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition"
                    >
                      {shortWallet(host.walletAddress)}
                      <Copy className="h-3 w-3 opacity-50" />
                    </button>
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
                    <button
                      onClick={() => copyToClipboard(buyer.walletAddress)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition"
                    >
                      {shortWallet(buyer.walletAddress)}
                      <Copy className="h-3 w-3 opacity-50" />
                    </button>
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
