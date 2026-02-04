import { Activity, Coins, RefreshCw, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { StatCard } from "../../components/admin/StatCard";
import { XPAnalyticsCard } from "../../components/admin/XPAnalyticsCard";
import { XPConfigCard } from "../../components/admin/XPConfigCard";
import { XPLeaderboardCard } from "../../components/admin/XPLeaderboardCard";
import { XPProcessingStatusCard } from "../../components/admin/XPProcessingStatusCard";
import Button from "../../components/ui/Button";
import server from "../../config/server";

interface XPConfig {
  id: number;
  configKey: string;
  configValue: string;
  description: string;
  isActive: boolean;
}

interface XPAnalytics {
  sourceBreakdown: Array<{
    sourceType: string;
    recordCount: number;
    totalXp: number;
    totalUsdValue: number;
    avgXpPerRecord: number;
  }>;
  totalStats: {
    totalRecords: number;
    totalXpAwarded: number;
    totalUsdProcessed: number;
    uniqueUsers: number;
  };
  recentActivity: Array<{
    date: string;
    recordCount: number;
    dailyXp: number;
  }>;
  topEarnersThisMonth: Array<{
    userId: number;
    monthlyXp: number;
    user: {
      pubkey: string;
      user_info?: {
        username?: string;
      };
    };
  }>;
}

interface ProcessingStatus {
  pendingTransactions: number;
  pendingRaffles: number;
  totalXpRecords: number;
  totalXpAwarded: number;
}

export default function AdminXP() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState<XPConfig[]>([]);
  const [analytics, setAnalytics] = useState<XPAnalytics | null>(null);
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus | null>(null);

  const fetchXPData = async () => {
    try {
      setRefreshing(true);

      const [configRes, analyticsRes, statusRes] = await Promise.all([
        server.get("/admin/xp-config"),
        server.get("/admin/xp-analytics"),
        server.get("/admin/xp-processing-status"),
      ]);

      setConfig(configRes.data.data.config || []);
      setAnalytics(analyticsRes.data.data || null);
      setProcessingStatus(statusRes.data.data.stats || null);
    } catch (error) {
      console.error("Error fetching XP data:", error);
      toast.error("Failed to fetch XP data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchXPData();
  }, []);

  const handleConfigUpdate = async (
    configKey: string,
    configValue: number,
    description?: string,
  ) => {
    try {
      await server.put("/admin/xp-config", {
        configKey,
        configValue,
        description,
      });

      toast.success("XP configuration updated successfully");
      await fetchXPData(); // Refresh data
    } catch (error: any) {
      console.error("Error updating XP config:", error);
      toast.error(
        error.response?.data?.message || "Failed to update XP configuration",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading XP management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">XP Management</h2>
          <p className="text-muted-foreground">
            Configure XP rates and monitor system performance
          </p>
        </div>
        <Button
          variant="default"
          size="icon"
          onClick={fetchXPData}
          disabled={refreshing}
          title="Refresh XP data"
          className="hover:bg-accent"
        >
          <RefreshCw
            className={`h-5 w-5 ${
              refreshing ? "animate-spin text-muted-foreground" : ""
            }`}
          />
        </Button>
      </div>

      {/* XP Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total XP Awarded"
          value={analytics?.totalStats.totalXpAwarded?.toLocaleString() || "0"}
          icon={<Star className="h-6 w-6" />}
        />
        <StatCard
          title="Active Users"
          value={analytics?.totalStats.uniqueUsers || 0}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="XP Records"
          value={analytics?.totalStats.totalRecords?.toLocaleString() || "0"}
          icon={<Activity className="h-6 w-6" />}
        />
        <StatCard
          title="USD Processed"
          value={`$${analytics?.totalStats.totalUsdProcessed?.toLocaleString() || "0"}`}
          icon={<Coins className="h-6 w-6" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* XP Configuration */}
        <div className="lg:col-span-1">
          <XPConfigCard
            config={config}
            onConfigUpdate={handleConfigUpdate}
            loading={refreshing}
          />
        </div>

        {/* XP Analytics */}
        <div className="lg:col-span-2">
          <XPAnalyticsCard analytics={analytics} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Processing Status */}
        <XPProcessingStatusCard status={processingStatus} />

        {/* Top XP Earners */}
        <XPLeaderboardCard topEarners={analytics?.topEarnersThisMonth || []} />
      </div>
    </div>
  );
}
