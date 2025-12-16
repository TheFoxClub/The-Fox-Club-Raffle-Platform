import { TrendingUp, Users, Wallet, Activity, Copy } from "lucide-react";
import { StatCard } from "../../components/admin/StatCard";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useEffect } from "react";
import server from "../../config/server";
import { toast } from "react-toastify";

interface VolumeData {
  date: string;
  volume: number;
}

interface TokenData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface TopWallet {
  wallet: string;
  spending: string;
  raffles: number;
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);

  const [kpiData, setKpiData] = useState({
    totalUsers: 0,
    activeWallets: 0,
    avgTicketPrice: 0,
    growthRate: 0,
  });

  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [tokenData, setTokenData] = useState<TokenData[]>([]);
  const [topWallets, setTopWallets] = useState<TopWallet[]>([]);

  const shortWallet = (wallet: string) =>
    wallet.slice(0, 4) + "..." + wallet.slice(-4);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: res } = await server.get("/analytics");
        if (res.success) {
          const data = res.data;
          // KPIs
          setKpiData({
            totalUsers: data.totalUsers,
            activeWallets: data.activeUsers,
            avgTicketPrice: data.averageTicketPrice.average,
            growthRate: data.growthRate.percentage,
          });

          const mappedVolume = data.volumeOverTime.map((v: any) => ({
            date: v.date,
            volume: v.totalVolume,
          }));
          setVolumeData(mappedVolume);

          const colors = [
            "hsl(10 85% 58%)",
            "hsl(25 90% 55%)",
            "hsl(38 95% 52%)",
            "hsl(240 5% 26%)",
          ];

          // Token type mapping
          const TOKEN_LABELS: Record<string, string> = {
            SOLANA: "SOL",
            USDC: "USDC",
          };

          const mappedTokens = data.volumeByTokenType.map(
            (t: any, index: number) => ({
              name: TOKEN_LABELS[t.tokenType] || t.tokenType, // fallback to original
              value: t.percentage,
              color: colors[index % colors.length],
            })
          );

          setTokenData(mappedTokens);

          const { data: leaderboardRes } = await server.get(
            "/admin/leaderboard"
          );
          if (leaderboardRes.success) {
            const topBuyers = leaderboardRes.data.topBuyers.map((b: any) => ({
              wallet: b.walletAddress,
              spending: `${b.totalSpent} ${
                b.tokenType === "SOLANA" ? "SOL" : b.tokenType
              }`,
              raffles: b.ticketsBought,
            }));
            setTopWallets(topBuyers);
          }

          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
    }
  };

  if (loading)
    return (
      <p className="text-center mt-10 text-muted-foreground">
        Loading analytics dashboard...
      </p>
    );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={kpiData.totalUsers.toLocaleString()}
          change={0}
          trend="up"
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
        />
        <StatCard
          title="Active Wallets"
          value={kpiData.activeWallets.toLocaleString()}
          change={0}
          trend="up"
          icon={<Wallet className="h-6 w-6 text-muted-foreground" />}
        />
        <StatCard
          title="Avg. Ticket Price"
          value={`${kpiData.avgTicketPrice} SOL`}
          change={0}
          trend="up"
          icon={<Activity className="h-6 w-6 text-muted-foreground" />}
        />
        <StatCard
          title="Growth Rate"
          value={`${kpiData.growthRate}%`}
          change={0}
          trend="up"
          icon={<TrendingUp className="h-6 w-6 text-muted-foreground" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Over Time */}
        <div className="glass-card p-6 rounded-xl border border-border/50">
          <h3 className="text-lg font-bold mb-6">Volume Over Time</h3>
          {volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 20%)" />
                <XAxis dataKey="date" stroke="hsl(240 5% 65%)" />
                <YAxis stroke="hsl(240 5% 65%)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 10% 7%)",
                    border: "1px solid hsl(240 6% 20%)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="hsl(10 85% 58%)"
                  strokeWidth={3}
                  dot={{ fill: "hsl(10 85% 58%)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center mt-10">No volume data available yet.</p>
          )}
        </div>

        {/* Volume by Token Type */}
        <div className="glass-card p-6 rounded-xl border border-border/50">
          <h3 className="text-lg font-bold mb-6">Volume by Token Type</h3>
          {tokenData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tokenData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tokenData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 10% 7%)",
                    border: "1px solid hsl(240 6% 20%)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center mt-10">No token data available yet</p>
          )}
        </div>
      </div>

      {/* Top Wallets Table */}
      <div className="glass-card p-6 rounded-xl border border-border/50">
        <h3 className="text-lg font-bold mb-6">Top Wallets by Spending</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border/50">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Rank</th>
                <th className="p-4 font-medium">Wallet</th>
                <th className="p-4 font-medium">Total Spending</th>
                <th className="p-4 font-medium">Raffles Entered</th>
              </tr>
            </thead>
            <tbody>
              {topWallets.length > 0 ? (
                topWallets.map((wallet, index) => (
                  <tr
                    key={wallet.wallet}
                    className="border-b border-border/30 hover:bg-muted/20"
                  >
                    <td className="p-4">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${
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
                    </td>
                    <td className="p-4 font-medium">
                      <button
                        onClick={() => copyToClipboard(wallet.wallet)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition"
                      >
                        {shortWallet(wallet.wallet)}
                        <Copy className="h-3 w-3 opacity-50" />
                      </button>
                    </td>
                    <td className="p-4 text-primary font-bold">
                      {wallet.spending}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {wallet.raffles}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center text-muted-foreground p-4"
                  >
                    No wallet data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
