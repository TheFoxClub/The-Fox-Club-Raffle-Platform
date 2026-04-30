import {
  TrendingUp,
  Users,
  Wallet,
  Activity,
  Copy,
  RefreshCw,
} from "lucide-react";
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
import Button from "../../components/ui/Button";
import { getTokenSymbol } from "../../utils/tokenUtils";

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
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  name,
  value,
  payload,
}: any) => {
  if (!value || percent <= 0) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const truncate = (num: number, decimals: number) => {
    const factor = Math.pow(10, decimals);
    return (Math.floor(num * factor) / factor).toFixed(decimals);
  };

  return (
    <text
      x={x}
      y={y}
      fill={payload.color}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={14}
    >
      {`${name} ${(percent * 100) >= 1 ? (truncate(percent * 100, 2)) : (truncate(percent * 100, 6))}%`}
    </text>
  );
};

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);

  const [kpiData, setKpiData] = useState({
    totalUsers: 0,
    activeWallets: 0,
    avgTicketPrice: 0,
    avgTicketTokenType: "SOLANA", // for avg ticket price
    growthRate: 0,
  });

  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [tokenData, setTokenData] = useState<TokenData[]>([]);
  const [topWallets, setTopWallets] = useState<TopWallet[]>([]);

  const mapNumericTokenType = (numericTokenType: number): string => {
    switch (numericTokenType) {
      case 0:
        return "SOLANA";
      case 1:
        return "SPL_TOKEN";
      case 2:
        return "SPL_TOKEN_2022";
      case 3:
        return "USDC";
      default:
        return "SOLANA";
    }
  };

  const shortWallet = (wallet: string) =>
    wallet.slice(0, 4) + "..." + wallet.slice(-4);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const { data: res } = await server.get("/analytics");
      if (res.success) {
        const data = res.data;

        setKpiData({
          totalUsers: data.totalUsers,
          activeWallets: data.activeUsers,
          avgTicketPrice: data.averageTicketPrice.average,
          avgTicketTokenType: mapNumericTokenType(
            data.averageTicketPrice.tokenType || 0
          ),
          growthRate: data.growthRate.percentage,
        });

        setVolumeData(
          data.volumeOverTime.map((v: any) => ({
            date: v.date,
            volume: v.totalVolume,
          }))
        );

        const colors = [
          "hsl(10 85% 58%)",
          "hsl(25 90% 55%)",
          "hsl(38 95% 52%)",
          "hsl(240 5% 26%)",
        ];

        setTokenData(
          data.volumeByTokenType
            .filter((t: any) => t.percentage > 0)
            .map((t: any, index: number) => ({
              name: getTokenSymbol(
                mapNumericTokenType(t.tokenTypeRaw || 0),
                t.tokenAddress
              ),
              value: t.percentage,
              color: colors[index % colors.length],
            }))
        );
      }

      const { data: leaderboardRes } = await server.get("/admin/leaderboard");
      if (leaderboardRes.success) {
        setTopWallets(
          leaderboardRes.data.topBuyers.map((b: any) => ({
            wallet: b.walletAddress,
            spending: `${b.totalSolSpent} ${getTokenSymbol(
              mapNumericTokenType(b.tokenType || 0),
              b.tokenAddress
            )}`,
            raffles: b.ticketsBought,
          }))
        );
      }
    } catch (error) {
      toast.error("Failed to refresh analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      {/* Page-level refresh */}
      <div className="flex justify-end">
        <Button
          variant="default"
          onClick={fetchAnalytics}
          disabled={loading}
          title="Refresh analytics"
          className="hover:bg-accent"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin text-muted-foreground" : ""
            }`}
          />
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={kpiData.totalUsers.toLocaleString()}
          // change={0}
          // trend="up"
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
        />
        <StatCard
          title="Active Wallets"
          value={kpiData.activeWallets.toLocaleString()}
          // change={0}
          // trend="up"
          icon={<Wallet className="h-6 w-6 text-muted-foreground" />}
        />
        <StatCard
          title="Avg. Ticket Price"
          value={`${kpiData.avgTicketPrice} ${getTokenSymbol(
            kpiData.avgTicketTokenType
          )}`}
          // change={0}
          // trend="up"
          icon={<Activity className="h-6 w-6 text-muted-foreground" />}
        />
        <StatCard
          title="Growth Rate"
          value={`${kpiData.growthRate}%`}
          // change={0}
          // trend="up"
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
                  //  label={({ name, value }) => `${name}: ${value}%`}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  // fill="#8884d8"
                  minAngle={10}
                  dataKey="value"
                >
                  {tokenData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsla(0, 1%, 87%, 1.00)",
                    border: "1px solid hsla(0, 0%, 63%, 1.00)",
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
                <th className="p-4 font-medium">Tickets Bought</th>
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
