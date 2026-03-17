import { useState, useEffect } from "react";
import { Star, Activity, RefreshCw } from "lucide-react";
import Button from "../ui/Button";
import server from "../../config/server";
import { toast } from "react-toastify";
import { getSourceConfig, getActivityLabel } from "../../config/xpSources";

interface XPSummary {
  user: {
    id: number;
    pubkey: string;
    totalXp: string;
    xpLastUpdated: string;
  };
  breakdown: Array<{
    count: number;
    totalXp: string;
    config: {
      configKey: string;
      description: string;
    };
  }>;
  totalXp: number;
}

interface UserXPCardProps {
  className?: string;
}

export function UserXPCard({ className = "" }: UserXPCardProps) {
  const [xpData, setXpData] = useState<XPSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchXPData = async () => {
    try {
      setRefreshing(true);
      const response = await server.get("/user/xp");
      setXpData(response.data.data);
    } catch (error: any) {
      console.error("Error fetching XP data:", error);
      if (error.response?.status !== 401) {
        toast.error("Failed to load XP data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchXPData();
  }, []);

  if (loading) {
    return (
      <div className={`glass-card p-6 rounded-xl border border-border/50 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!xpData) {
    return (
      <div className={`glass-card p-6 rounded-xl border border-border/50 ${className}`}>
        <div className="text-center py-8">
          <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">XP System</h3>
          <p className="text-muted-foreground text-sm">
            Start earning XP by buying tickets, creating raffles, and generating revenue!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card p-6 rounded-xl border border-border/50 hover:border-primary/50 transition-all ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gradient-primary/10">
            <Star className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Experience Points</h3>
            <p className="text-sm text-muted-foreground">Your XP journey</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchXPData}
          disabled={refreshing}
          title="Refresh XP data"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Total XP */}
      <div className="text-center mb-6 p-4 rounded-lg bg-gradient-primary/5 border border-primary/20">
        <div className="text-3xl font-bold text-gradient mb-1">
          {Number(xpData.totalXp).toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">Total XP Earned</div>
      </div>

      {/* XP Breakdown */}
      {xpData.breakdown.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">XP Sources</h4>
          {xpData.breakdown
            .filter((source) => source?.config?.configKey)
            .map((source, index) => {
            const config = getSourceConfig(source.config.configKey);
            const Icon = config.icon;
            const activityLabel = getActivityLabel(source.config.configKey, source.count);
            
            return (
              <div key={source.config.configKey || index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {source.count} {activityLabel}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    +{parseFloat(source.totalXp).toLocaleString()} XP
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {xpData.breakdown.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No XP activities yet</p>
          <p className="text-xs mt-1">Start by buying tickets or creating raffles!</p>
        </div>
      )}

      {/* Last Updated */}
      {xpData.user.xpLastUpdated && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            Last updated: {new Date(xpData.user.xpLastUpdated).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}