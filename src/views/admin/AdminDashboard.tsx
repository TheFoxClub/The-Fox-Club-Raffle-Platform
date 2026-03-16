import {
  Wallet,
  Ticket,
  Trophy,
  Coins,
  TrendingUp,
  Users,
  Copy,
  RefreshCw,
  Star,
} from "lucide-react";
import { StatCard } from "../../components/admin/StatCard";
import { TopRaffleItem } from "../../components/admin/TopRaffleItem";
import { TopCreatorItem } from "../../components/admin/TopCreatorItem";
import Button from "../../components/ui/Button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import server from "../../config/server";
import { toast } from "react-toastify";
import { getTokenSymbol } from "../../utils/tokenUtils";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTicketsSold: 0,
    totalPlatformRevenue: 0,
    liveRaffleCount: 0,
    tokenType: "MIXED", // Indicates mixed token types -> show as "Total Volume" instead of specific token
  });

  const [xpStats, setXpStats] = useState({
    totalXpAwarded: 0,
    uniqueUsers: 0,
  });

  const [topRaffles, setTopRaffles] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [creatorsRes, rafflesRes, statsRes, xpRes] = await Promise.all([
        server.get("admin/top-creators"),
        server.get("/admin/top-raffles"),
        server.get("/admin/dashboard-stats"),
        server
          .get("/admin/xp-analytics")
          .catch(() => ({ data: { data: null } })), // XP might not be available yet
      ]);
      setTopCreators(creatorsRes.data.data);
      setTopRaffles(rafflesRes.data.data);
      setStats({
        // totalRevenue: statsRes.data.data.totalRevenue,
        // totalTicketsSold: statsRes.data.data.totalTicketsSold,
        // totalPlatformRevenue: statsRes.data.data.totalPlatformRevenue,
        // liveRaffleCount: statsRes.data.data.liveRaffleCount,
        // tokenType: "MIXED", //for mixed of sol and other tokens
        totalRevenue: statsRes.data.data.totalRevenue,
        totalTicketsSold: statsRes.data.data.totalTicketsSold,
        totalPlatformRevenue: statsRes.data.data.totalPlatformRevenue,
        liveRaffleCount: statsRes.data.data.liveRaffleCount,
        tokenType: "SOL", //sol only
      });

      // Set XP stats if available
      if (xpRes.data.data?.totalStats) {
        setXpStats({
          totalXpAwarded: xpRes.data.data.totalStats.totalXpAwarded || 0,
          uniqueUsers: xpRes.data.data.totalStats.uniqueUsers || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to refresh dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold">Dashboard Overview</p>
        <Button
          variant="default"
          size="icon"
          onClick={fetchDashboardData}
          disabled={loading}
          title="Refresh dashboard"
          className="hover:bg-accent"
        >
          <RefreshCw
            className={`h-5 w-5 ${
              loading ? "animate-spin text-muted-foreground" : ""
            }`}
          />
        </Button>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
        <StatCard
          title="Total Volume"
          value={
            stats.tokenType === "MIXED"
              ? `${stats.totalRevenue.toFixed(4)} (Mixed)`
              : `${stats.totalRevenue} ${getTokenSymbol(stats.tokenType)}`
          }
          //change={0}
          //trend="up"
          icon={<Wallet className="h-6 w-6" />}
        />
        <StatCard
          title="Live Raffles"
          value={stats.liveRaffleCount}
          // change={0}
          //trend="up"
          icon={<Ticket className="h-6 w-6" />}
        />
        <StatCard
          title="Total Tickets Sold"
          value={stats.totalTicketsSold}
          // change={0}
          // trend="up"
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="Platform Fees Earned"
          value={
            stats.tokenType === "MIXED"
              ? `${stats.totalPlatformRevenue.toFixed(4)} (Mixed)`
              : `${stats.totalPlatformRevenue} ${getTokenSymbol(
                  stats.tokenType
                )}`
          }
          // change={0}
          // trend="up"
          icon={<Coins className="h-6 w-6" />}
        />
        <StatCard
          title="Total XP Awarded"
          value={xpStats.totalXpAwarded.toLocaleString()}
          icon={<Star className="h-6 w-6" />}
        />
        <StatCard
          title="XP Users"
          value={xpStats.uniqueUsers}
          icon={<Trophy className="h-6 w-6" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Top Performing Raffles */}
        <div className="lg:col-span-2 glass-card p-4 sm:p-6 rounded-xl border border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Performing Raffles
            </h2>
            <Link to="/admin/raffles">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {topRaffles.length > 0 ? (
              topRaffles.map((raffle, index) => (
                <TopRaffleItem key={index} raffle={raffle} />
              ))
            ) : (
              <p className="text-muted-foreground mt-20 text-center">
                No top raffles available yet.
              </p>
            )}
          </div>
        </div>

        {/* Top Creators & Quick Actions */}
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Actions */}
          <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
            <h2 className="text-base sm:text-lg font-bold mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2 sm:space-y-3">
              <Link to="/create" className="block">
                <Button className="w-full gradient-primary text-sm sm:text-base">
                  <Ticket className="h-4 w-4 mr-2" />
                  Create Raffle
                </Button>
              </Link>
              <Link to="/admin/collections" className="block">
                <Button
                  variant="outline"
                  className="w-full text-sm sm:text-base"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Add Collection
                </Button>
              </Link>
              <Link to="/admin/tokens" className="block">
                <Button
                  variant="outline"
                  className="w-full text-sm sm:text-base"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Add Token
                </Button>
              </Link>
              <Link to="/admin/xp" className="block">
                <Button
                  variant="outline"
                  className="w-full text-sm sm:text-base"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Manage XP
                </Button>
              </Link>
            </div>
          </div>

          {/* Top Creators */}
          <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
            <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              Top Creators
            </h2>
            <div className="space-y-4">
              {topCreators.length > 0 ? (
                topCreators.map((creator) => (
                  <TopCreatorItem
                    key={creator.walletAddress}
                    creator={creator}
                  />
                ))
              ) : (
                <p className="text-muted-foreground">
                  No top creators available yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
