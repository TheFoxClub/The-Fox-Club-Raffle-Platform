import { useState, useEffect } from "react";
import { Calendar, Clock3, Coins, RefreshCw, Star, User } from "lucide-react";
import Button from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import server from "../../config/server";
import { toast } from "react-toastify";
import { formatXp } from "../../utils/formatXp";

interface PeriodicLeaderboardUser {
  rank: number;
  userId: number;
  walletAddress: string;
  username: string | null;
  periodXp: number;
  allTimeXp: number;
  potentialReward: number;
}

interface PeriodicLeaderboardData {
  airdrop: {
    id: number;
    airdropName?: string;
    startDate: string;
    endDate: string;
    tokenSymbol: string | null;
    tokenAddress: string | null;
    totalAmount: number;
    createdAt: string;
  } | null;
  users: PeriodicLeaderboardUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function PeriodicLeaderboard() {
  const [data, setData] = useState<PeriodicLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPeriodicLeaderboard = async (page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await server.get(
        `/airdrop/periodic-leaderboard?page=${page}&limit=50`
      );

      setData(response.data.data);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching periodic leaderboard:", error);
      toast.error("Failed to load periodic leaderboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPeriodicLeaderboard();
  }, []);

  const shortenAddress = (address: string, start = 3, end = 3) =>
    `${address.slice(0, start)}...${address.slice(-end)}`;

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";

    const date = parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const time = parsed.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return `${date} ${time}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
    }
  };

  const getPeriodStatus = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return null;

    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return {
        status: "Upcoming",
        color: "bg-accent border-accent shadow-[0_0_20px_var(--accent)]",
        textColor: "text-white",
      };
    } else if (now > end) {
      return {
        status: "Ended",
        color: "bg-muted border-border shadow-[0_0_20px_var(--muted)]",
        textColor: "text-white",
      };
    } else {
      return {
        status: "Ongoing",
        color: "bg-primary border-primary shadow-[0_0_20px_var(--primary)]",
        textColor: "text-white",
      };
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading periodic leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-primary/10">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Reward Leaderboard</h1>
              <p className="text-muted-foreground">
                XP earned during the latest airdrop period
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => fetchPeriodicLeaderboard(currentPage)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {data?.airdrop && (
          <Card className="border border-border/50 bg-card/50 p-4 backdrop-blur-xl">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Active Reward Leaderboard
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-1">
                    {data.airdrop.airdropName || "Latest Airdrop"}
                  </h2>
                </div>
                {getPeriodStatus(data.airdrop.startDate, data.airdrop.endDate) && (
                  <div
                    className={`px-4 py-2 rounded-lg border font-semibold ${
                      getPeriodStatus(data.airdrop.startDate, data.airdrop.endDate)?.color
                    }`}
                  >
                    <span
                      className={getPeriodStatus(data.airdrop.startDate, data.airdrop.endDate)?.textColor}
                    >
                      {getPeriodStatus(data.airdrop.startDate, data.airdrop.endDate)?.status}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="flex items-center gap-3 rounded-md border border-orange-500/40 bg-orange-500/10 px-4 py-3"><Coins className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Total Period Rewards</p><p className="font-bold text-primary">{data.airdrop.totalAmount.toLocaleString()} {data.airdrop.tokenSymbol || "tokens"}</p></div></div>
                <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/40 px-4 py-3"><Calendar className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">From</p><p className="text-sm font-semibold">{formatDate(data.airdrop.startDate)}</p></div></div>
                <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/40 px-4 py-3"><Clock3 className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">To</p><p className="text-sm font-semibold">{formatDate(data.airdrop.endDate)}</p></div></div>
              </div>

            </div>
          </Card>
        )}

        {data && data.users.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="border border-border/50 bg-card/50 p-5 backdrop-blur-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Leaderboard</h3>
                <p className="text-sm text-muted-foreground">
                  {data.pagination.total.toLocaleString()} participants
                </p>
              </div>

              {data.users.map((user) => (
                <div
                  key={`${user.userId}-${user.rank}`}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    user.rank <= 3
                      ? user.rank === 1
                        ? "bg-linear-to-r border-yellow-200"
                        : user.rank === 2
                          ? "bg-linear-to-r border-gray-200"
                          : "bg-linear-to-r border-orange-200"
                      : "bg-muted/20 border-border/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                        user.rank === 1
                          ? "bg-linear-to-r from-yellow-500 to-orange-500 text-white"
                          : user.rank === 2
                            ? "bg-linear-to-r from-gray-400 to-gray-500 text-white"
                            : user.rank === 3
                              ? "bg-linear-to-r from-orange-500 to-red-500 text-white"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.rank}
                    </div>

                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        {user.username ? (
                          <>
                            <p className="font-medium text-left">{user.username}</p>
                            <button
                              onClick={() => copyToClipboard(user.walletAddress)}
                              className="block text-xs mt-1 hover:text-primary transition cursor-pointer"
                              title="Click to copy wallet address"
                            >
                              {shortenAddress(user.walletAddress)}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => copyToClipboard(user.walletAddress)}
                            className="font-medium text-left hover:text-primary transition cursor-pointer"
                            title="Click to copy wallet address"
                          >
                            {shortenAddress(user.walletAddress)}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      <span className="text-lg font-semibold sm:font-bold text-primary">
                        {formatXp(user.periodXp)} XP
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPeriodicLeaderboard(currentPage - 1)}
                  disabled={currentPage === 1 || refreshing}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPeriodicLeaderboard(currentPage + 1)}
                  disabled={currentPage === data.pagination.totalPages || refreshing}
                >
                  Next
                </Button>
              </div>
            )}
          </Card>
          <Card className="border border-border/50 bg-card/50 p-5 backdrop-blur-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Potential Rewards</h3><p className="text-sm text-muted-foreground">{data.pagination.total.toLocaleString()} participants</p></div>
              {data.users.map((user) => (
                <div key={`reward-${user.userId}-${user.rank}`} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-4">
                  <div className="flex items-center gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">{user.rank}</div><div><p className="font-medium">{user.username || shortenAddress(user.walletAddress)}</p><p className="text-xs text-muted-foreground">{shortenAddress(user.walletAddress)}</p></div></div>
                  <div className="flex items-center gap-2 text-emerald-300"><Coins className="h-5 w-5" /><span className="text-lg font-bold">{user.potentialReward.toLocaleString(undefined, { maximumFractionDigits: 4 })} {data.airdrop.tokenSymbol || "tokens"}</span></div>
                </div>
              ))}
            </div>
          </Card>
          </div>
        ) : (
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-12">
            <div className="text-center space-y-4">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold">No Periodic Data Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Periodic leaderboard will appear once an airdrop with a saved period exists and users have earned XP in that range.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
