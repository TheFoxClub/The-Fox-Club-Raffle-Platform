import { useState, useEffect } from "react";
import { Calendar, Clock3, RefreshCw, Star, User } from "lucide-react";
import Button from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import server from "../../config/server";
import { toast } from "react-toastify";

interface PeriodicLeaderboardUser {
  rank: number;
  userId: number;
  walletAddress: string;
  username: string | null;
  periodXp: number;
  allTimeXp: number;
}

interface PeriodicLeaderboardData {
  airdrop: {
    id: number;
    airdropName?: string;
    startDate: string;
    endDate: string;
    tokenSymbol: string | null;
    tokenAddress: string | null;
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
    return new Date(value).toLocaleDateString();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
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
              <h1 className="text-3xl font-bold">Periodic Leaderboard</h1>
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
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 md:p-8">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Active Period Snapshot
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-1">
                    {data.airdrop.airdropName || "Latest Airdrop"}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/50 bg-background/40 p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Start Date
                  </p>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="text-xl md:text-2xl font-extrabold leading-tight">
                        {formatDate(data.airdrop.startDate)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/40 p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    End Date
                  </p>
                  <div className="flex items-start gap-3">
                    <Clock3 className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="text-xl md:text-2xl font-extrabold leading-tight">
                        {formatDate(data.airdrop.endDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </Card>
        )}

        {data && data.users.length > 0 ? (
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Full Rankings</h3>
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
                        {user.periodXp.toLocaleString()} XP
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
