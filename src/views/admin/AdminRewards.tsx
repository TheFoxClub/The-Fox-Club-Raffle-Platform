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
import { useState, useEffect, useRef } from "react";
import server from "../../config/server";
import { toast } from "react-toastify";

type EligibleWallet = {
  id: number;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export default function AdminRewards() {
  // const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const rewardPool = 0;
  const poolProgress = 0;
  const [topHosts, setTopHosts] = useState<any[]>([]);
  const [topBuyers, setTopBuyers] = useState<any[]>([]);

  // Wallets
  const [walletInput, setWalletInput] = useState("");
  const [eligibleWallets, setEligibleWallets] = useState<EligibleWallet[]>([]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputWrapperRef = useRef<HTMLDivElement | null>(null);
  const [searchInput, setSearchInput] = useState(""); // Search input for wallet list

  // Filter wallets in list based on searchInput
  const filteredWalletList = searchInput
    ? eligibleWallets.filter((w) =>
        w.address.toLowerCase().includes(searchInput.toLowerCase())
      )
    : eligibleWallets;

  const filteredWallets = walletInput
    ? eligibleWallets
        .filter(
          (wallet) =>
            wallet.address.toLowerCase().includes(walletInput.toLowerCase()) &&
            wallet.address.toLowerCase() !== walletInput.toLowerCase()
        )
        .sort((a, b) => b.id - a.id)
    : [];

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
    toast.info(`Exporting ${type} data to CSV...`);
  };

  const handleAirdrop = () => {
    toast.success("Airdrop triggered successfully");
  };

  const fetchEligibleWallets = async () => {
    const res = await server.get("/pool");
    setEligibleWallets(res.data.data.rows.reverse());
  };

  const handleAddWallet = async () => {
    const address = walletInput.trim();
    if (!address) return;

    const exists = eligibleWallets.some(
      (w) => w.address.toLowerCase() === address.toLowerCase()
    );

    if (exists) {
      toast.warning("Wallet already exists");
      return;
    }

    try {
      const res = await server.post("/pool", { address });
      setEligibleWallets((prev) => [res.data.data, ...prev]);
      toast.success("Wallet added successfully");
      setWalletInput("");
      setShowSuggestions(false);
    } catch {
      toast.error("Failed to add wallet");
    }
  };

  const handleDeleteWallet = async () => {
    const address = walletInput.trim();
    if (!address) return;

    const exists = eligibleWallets.some(
      (w) => w.address.toLowerCase() === address.toLowerCase()
    );

    if (!exists) {
      toast.warning("Wallet not found");
      return;
    }

    try {
      await server.delete(`/pool?address=${address}`);
      setEligibleWallets((prev) =>
        prev.filter((wallet) => wallet.address !== address)
      );
      toast.success("Wallet removed successfully");
      setWalletInput("");
      setShowSuggestions(false);
    } catch {
      toast.error("Failed to delete wallet");
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      await server.post("/pool/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("CSV uploaded successfully");
      await fetchEligibleWallets();
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload CSV");
    } finally {
      e.target.value = "";
    }
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
        const [leaderboardRes, walletRes] = await Promise.all([
          server.get("/admin/leaderboard"),
          server.get("/pool"),
        ]);

        setTopHosts(leaderboardRes.data.data.topHosts);
        setTopBuyers(leaderboardRes.data.data.topBuyers);
        setEligibleWallets(walletRes.data.data.rows);
      } catch (error) {
        console.error("Failed to load admin data", error);
        toast.error("Failed to load admin data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          <div ref={inputWrapperRef} className="relative mt-8 mb-4">
            <input
              value={walletInput}
              onChange={(e) => {
                setWalletInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => walletInput && setShowSuggestions(true)}
              placeholder="Enter wallet address"
              className="w-full border border-input rounded-lg p-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {walletInput && (
              <button
                type="button"
                onClick={() => {
                  setWalletInput("");
                  setShowSuggestions(false);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}

            {showSuggestions && walletInput && filteredWallets.length > 0 && (
              <div className="absolute top-full left-0 z-20 w-full max-h-40 overflow-y-auto rounded-lg border bg-card shadow-lg mt-2">
                {filteredWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => {
                      setWalletInput(wallet.address);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/30 font-mono"
                  >
                    {wallet.address}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4 mb-4">
            <Button
              onClick={handleAddWallet}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Wallet
            </Button>
            <Button
              onClick={handleDeleteWallet}
              variant="destructive"
              disabled={!walletInput} // disable when input is empty
              className={`flex-1 flex items-center justify-center gap-2 ${
                !walletInput ? "opacity-50 cursor-not-allowed" : ""
              }`}
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

        {/* Right: Scrollable wallet list */}
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50 max-h-80 flex flex-col w-full overflow-y-auto">
          <div className="sticky top-0 z-10 p-1 mb-2 flex flex-col gap-2">
            <h2 className="text-base font-semibold">
              Current Eligible Wallets
            </h2>
            <input
              type="text"
              placeholder="Search wallets..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full border border-input rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted/50 w-full">
            {filteredWalletList.length > 0 ? (
              filteredWalletList.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex justify-between items-center p-2 mb-1 rounded bg-card/50 border border-border/20 w-full break-words"
                >
                  {/* <span className="font-mono text-sm break-words">
                      {wallet.address}
                    </span> */}
                  <p
                    className="text-xs text-muted-foreground break-all mb-3 cursor-pointer hover:text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(wallet.address);
                      toast.success("Wallet address copied!");
                    }}
                    title="Click to copy"
                  >
                    {wallet.address}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                No wallets found
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
