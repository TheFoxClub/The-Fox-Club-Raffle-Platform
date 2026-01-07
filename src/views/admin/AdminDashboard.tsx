import {
  Wallet,
  Ticket,
  Trophy,
  Coins,
  TrendingUp,
  Users,
  Copy,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "../../components/admin/StatCard";
import Button from "../../components/ui/Button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import server from "../../config/server";
import { toast } from "react-toastify";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTicketsSold: 0,
    totalPlatformRevenue: 0,
    liveRaffleCount: 0,
  });

  const [topRaffles, setTopRaffles] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);

  const shortWallet = (address: string) => {
    if (!address) return "";
    return address.slice(0, 6) + "..." + address.slice(-6);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied!", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (err) {
      toast.error("Failed to copy wallet address", {
        position: "top-right",
      });
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [creatorsRes, rafflesRes, statsRes] = await Promise.all([
        server.get("admin/top-creators"),
        server.get("/admin/top-raffles"),
        server.get("/admin/dashboard-stats"),
      ]);
      setTopCreators(creatorsRes.data.data);
      setTopRaffles(rafflesRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to refresh dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   async function fetchData() {
  //     try {
  //       // Fetch top creators
  //       const creatorsRes = await server.get("/admin/top-creators");
  //       const creatorsData = creatorsRes.data.data;
  //       setTopCreators(creatorsData);

  //       // Fetch top raffles
  //       const rafflesRes = await server.get("/admin/top-raffles");
  //       const rafflesData = rafflesRes.data.data;
  //       setTopRaffles(rafflesData);

  //       // Fetch dashboard stats
  //       const statsRes = await server.get("/admin/dashboard-stats");
  //       setStats(statsRes.data.data);
  //     } catch (error) {
  //       console.error("Error fetching top creators:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   fetchData();
  // }, []);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Volume"
          value={`${stats.totalRevenue} SOL`}
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
          value={`${stats.totalPlatformRevenue} SOL`}
          // change={0}
          // trend="up"
          icon={<Coins className="h-6 w-6" />}
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
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-card/50 border border-border/30 hover:border-primary/50 transition-all gap-3"
                >
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-semibold mb-1">{raffle.raffleName}</h3>
                    <button
                      onClick={() => copyToClipboard(raffle.creatorAddress)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition"
                    >
                      {shortWallet(raffle.creatorAddress)}
                      <Copy className="h-3 w-3 opacity-50" />
                    </button>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:items-end gap-2 w-full sm:w-auto">
                    <p className="font-bold text-primary">
                      {raffle.revenueInSOL} SOL
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {raffle.totalTicketsSold} tickets
                    </p>
                  </div>
                  <div className="w-24 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        raffle.status === "LIVE"
                          ? "bg-green-500/20 text-green-500"
                          : raffle.status == "UPCOMING"
                          ? "bg-secondary/20 text-secondary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {raffle.status}
                    </span>
                  </div>
                </div>
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
                  <div
                    key={creator.walletAddress}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                        creator.rank === 1
                          ? "bg-gradient-primary text-white"
                          : creator.rank === 2
                          ? "bg-secondary/20 text-secondary"
                          : "bg-accent/20 text-accent"
                      }`}
                    >
                      {creator.rank}
                    </div>
                    <div className="flex-1">
                      <button
                        onClick={() => copyToClipboard(creator.walletAddress)}
                        className="flex items-center gap-1 text-sm font-medium hover:text-primary transition"
                      >
                        {shortWallet(creator.walletAddress)}
                        <Copy className="h-3 w-3 opacity-50" />
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {creator.totalRevenue} SOL
                      </p>
                    </div>
                  </div>
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
