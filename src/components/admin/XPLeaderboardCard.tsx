import { Trophy, Star, User } from "lucide-react";
import { toast } from "react-toastify";

interface TopEarner {
  userId: number;
  monthlyXp: number;
  user: {
    pubkey: string;
    user_info?: {
      username?: string;
    };
  };
}

interface XPLeaderboardCardProps {
  topEarners: TopEarner[];
}

export function XPLeaderboardCard({ topEarners }: XPLeaderboardCardProps) {
  const shortenAddress = (address: string, start = 4, end = 4) =>
    `${address.slice(0, start)}...${address.slice(-end)}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
    }
  };

  return (
    <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">Top XP Earners This Month</h3>
      </div>

      <div className="space-y-3">
        {topEarners.length > 0 ? (
          topEarners.slice(0, 10).map((earner, index) => (
            <div
              key={earner.userId}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors `}
            >
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    index === 0
                      ? "bg-yellow-500 text-white"
                      : index === 1
                        ? "bg-gray-400 text-white"
                        : index === 2
                          ? "bg-orange-500 text-white"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < 3 ? <Trophy className="h-4 w-4" /> : index + 1}
                </div>

                {/* User Info */}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {/* <div>
                    <p className="text-sm font-medium">
                      {earner.user.user_info?.username ||
                        shortenAddress(earner.user.pubkey)}
                    </p>
                    {earner.user.user_info?.username && (
                      <p className="text-xs text-muted-foreground">
                        {shortenAddress(earner.user.pubkey)}
                      </p>
                    )}
                  </div> */}
                  <div>
                    <button
                      onClick={() => copyToClipboard(earner.user.pubkey)}
                      className="text-sm font-medium text-left hover:text-primary
               transition cursor-pointer"
                      title="Click to copy wallet address"
                    >
                      {earner.user.user_info?.username ||
                        shortenAddress(earner.user.pubkey)}
                    </button>

                    {earner.user.user_info?.username && (
                      <button
                        onClick={() => copyToClipboard(earner.user.pubkey)}
                        className="block text-xs hover:text-primary transition"
                        title="Click to copy wallet address"
                      >
                        {shortenAddress(earner.user.pubkey)}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* XP Amount */}
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary">
                  {earner.monthlyXp.toLocaleString()} XP
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No XP earners this month</p>
            <p className="text-xs mt-1">
              Top earners will appear here once users start earning XP
            </p>
          </div>
        )}
      </div>

      {topEarners.length > 10 && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            Showing top 10 of {topEarners.length} earners this month
          </p>
        </div>
      )}
    </div>
  );
}
