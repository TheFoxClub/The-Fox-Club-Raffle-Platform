import { TrendingUp, Users, Wallet, Activity } from "lucide-react";
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

const volumeData = [
  { date: "Jan", volume: 1200 },
  { date: "Feb", volume: 1900 },
  { date: "Mar", volume: 2400 },
  { date: "Apr", volume: 3200 },
  { date: "May", volume: 2800 },
  { date: "Jun", volume: 3600 },
];

const tokenData = [
  { name: "SOL", value: 45, color: "hsl(10 85% 58%)" },
  { name: "USDC", value: 30, color: "hsl(25 90% 55%)" },
  { name: "BONK", value: 15, color: "hsl(38 95% 52%)" },
  { name: "Others", value: 10, color: "hsl(240 5% 26%)" },
];

const topWallets = [
  { wallet: "7XYZ...abc1", spending: "2,345 SOL", raffles: 45 },
  { wallet: "8ABC...def2", spending: "1,876 SOL", raffles: 38 },
  { wallet: "9DEF...ghi3", spending: "1,543 SOL", raffles: 32 },
  { wallet: "4GHI...jkl4", spending: "1,234 SOL", raffles: 28 },
];

export default function AdminAnalytics() {
  return (
    <div className="w-84 md:w-full">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Users"
          value="8,942"
          change={12.5}
          trend="up"
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="Active Wallets"
          value="3,247"
          change={8.2}
          trend="up"
          icon={<Wallet className="h-6 w-6" />}
        />
        <StatCard
          title="Avg. Ticket Price"
          value="0.85 SOL"
          change={5.3}
          trend="up"
          icon={<Activity className="h-6 w-6" />}
        />
        <StatCard
          title="Growth Rate"
          value="15.3%"
          change={2.1}
          trend="up"
          icon={<TrendingUp className="h-6 w-6" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 sm:gap-6">
        {/* Volume Over Time */}
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50 overflow-hidden">
          <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6">
            Volume Over Time
          </h3>
          <div className="w-full h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={volumeData}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 20%)" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(240 5% 65%)"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="hsl(240 5% 65%)"
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 10% 7%)",
                    border: "1px solid hsl(240 6% 20%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="hsl(10 85% 58%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(10 85% 58%)", r: 3 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume by Token Type */}
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50 overflow-hidden">
          <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6">
            Volume by Token Type
          </h3>
          <div className="w-full h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <Pie
                  data={tokenData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={60}
                  innerRadius={0}
                  fill="#8884d8"
                  dataKey="value">
                  {tokenData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 10% 7%)",
                    border: "1px solid hsl(240 6% 20%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Wallets Table */}
      <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
        <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6">
          Top Wallets by Spending
        </h3>

        {/* Force horizontal scroll on mobile */}
        <div className="relative overflow-x-auto w-full">
          {/* Set a min width so table doesn't squish on mobile */}
          <table className="min-w-[600px] w-full text-sm text-left text-muted-foreground">
            <thead className="text-xs sm:text-sm text-muted-foreground bg-muted/20 border-b border-border/50">
              <tr>
                <th className="px-3 sm:px-6 py-3 font-medium">Rank</th>
                <th className="px-3 sm:px-6 py-3 font-medium whitespace-nowrap">
                  Wallet
                </th>
                <th className="px-3 sm:px-6 py-3 font-medium whitespace-nowrap">
                  Total Spending
                </th>
                <th className="px-3 sm:px-6 py-3 font-medium whitespace-nowrap">
                  Raffles Entered
                </th>
              </tr>
            </thead>

            <tbody>
              {topWallets.map((wallet, index) => (
                <tr
                  key={wallet.wallet}
                  className="bg-card/50 border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                        index === 0
                          ? "bg-gradient-primary text-white"
                          : index === 1
                          ? "bg-secondary/20 text-secondary"
                          : index === 2
                          ? "bg-accent/20 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}>
                      {index + 1}
                    </div>
                  </td>

                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm whitespace-nowrap">
                    {wallet.wallet}
                  </td>

                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-primary font-bold text-xs sm:text-sm whitespace-nowrap">
                    {wallet.spending}
                  </td>

                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                    {wallet.raffles}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
