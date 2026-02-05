import { useState, useEffect } from "react";
import { Star, Trophy, User, RefreshCw, Medal, Crown } from "lucide-react";
import Button from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import server from "../../config/server";
import { toast } from "react-toastify";

interface LeaderboardUser {
  id: number;
  pubkey: string;
  totalXp: number;
  rank: number;
  user_info?: {
    username?: string;
  };
}

interface LeaderboardData {
  users: LeaderboardUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function XPLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLeaderboard = async (page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await server.get(
        `/user/xp/leaderboard?page=${page}&limit=50`,
      );
      setLeaderboard(response.data.data);
      setCurrentPage(page);
    } catch (error: any) {
      console.error("Error fetching XP leaderboard:", error);
      toast.error("Failed to load XP leaderboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const shortenAddress = (address: string, start = 4, end = 4) =>
    `${address.slice(0, start)}...${address.slice(-end)}`;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-orange-500" />;
      default:
        return <Trophy className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white";
      case 2:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
      case 3:
        return "bg-gradient-to-r from-orange-500 to-red-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading XP leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-primary/10">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">XP Leaderboard</h1>
              <p className="text-muted-foreground">
                Top XP earners on the platform
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => fetchLeaderboard(currentPage)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Leaderboard */}
        {leaderboard && leaderboard.users.length > 0 ? (
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-6">
            <div className="space-y-4">
              {/* Top 3 Podium */}
              {leaderboard.users.slice(0, 3).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 text-center">
                    🏆 Top 3 Champions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {leaderboard.users.slice(0, 3).map((user) => (
                      <Card
                        key={user.id}
                        className={`p-6 text-center space-y-4 border-2 ${
                          user.rank === 1
                            ? "border-yellow-500 bg-gradient-to-br"
                            : user.rank === 2
                              ? "border-gray-400 bg-gradient-to-br"
                              : "border-orange-500 bg-gradient-to-br"
                        }`}
                      >
                        <div className="flex justify-center">
                          {getRankIcon(user.rank)}
                        </div>

                        <div className="text-center">
                          {user.user_info?.username ? (
                            <>
                              <p className="font-bold text-lg">
                                {user.user_info.username}
                              </p>

                              <button
                                onClick={() => copyToClipboard(user.pubkey)}
                                className="block mx-auto mt-1 text-sm text-center
                   hover:text-primary transition cursor-pointer"
                                title="Click to copy wallet address"
                              >
                                {shortenAddress(user.pubkey)}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => copyToClipboard(user.pubkey)}
                              className="font-bold text-lg text-center
                 hover:text-primary transition cursor-pointer"
                              title="Click to copy wallet address"
                            >
                              {shortenAddress(user.pubkey)}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-5 w-5 text-primary" />
                          <span className="text-xl font-bold text-primary">
                            {user.totalXp.toLocaleString()} XP
                          </span>
                        </div>
                        <div
                          className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getRankBadgeStyle(user.rank)}`}
                        >
                          #{user.rank}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Leaderboard */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-4">Full Rankings</h3>
                {leaderboard.users.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      user.rank <= 3
                        ? user.rank === 1
                          ? "bg-gradient-to-r border-yellow-200"
                          : user.rank === 2
                            ? "bg-gradient-to-r border-gray-200"
                            : "bg-gradient-to-r border-orange-200"
                        : "bg-muted/20 border-border/30 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getRankBadgeStyle(user.rank)}`}
                      >
                        {user.rank <= 3 ? getRankIcon(user.rank) : user.rank}
                      </div>

                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />

                        <div>
                          {user.user_info?.username ? (
                            <>
                              <p className="font-medium text-left">
                                {user.user_info.username}
                              </p>

                              <button
                                onClick={() => copyToClipboard(user.pubkey)}
                                className="block text-xs mt-1 hover:text-primary transition cursor-pointer"
                                title="Click to copy wallet address"
                              >
                                {shortenAddress(user.pubkey)}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => copyToClipboard(user.pubkey)}
                              className="font-medium text-left hover:text-primary transition cursor-pointer"
                              title="Click to copy wallet address"
                            >
                              {shortenAddress(user.pubkey)}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* XP Amount */}
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      <span className="text-lg font-bold text-primary">
                        {user.totalXp.toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {leaderboard.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLeaderboard(currentPage - 1)}
                    disabled={currentPage === 1 || refreshing}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Page {leaderboard.pagination.page} of{" "}
                    {leaderboard.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLeaderboard(currentPage + 1)}
                    disabled={
                      currentPage === leaderboard.pagination.totalPages ||
                      refreshing
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-12">
            <div className="text-center space-y-4">
              <Star className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold">No XP Data Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                The XP leaderboard will populate as users start earning
                experience points through ticket purchases, raffle creation, and
                generating revenue.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
