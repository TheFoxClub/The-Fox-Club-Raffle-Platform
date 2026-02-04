import { TrendingUp, Activity, DollarSign, Users } from "lucide-react";

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
}

interface XPAnalyticsCardProps {
  analytics: XPAnalytics | null;
}

const SOURCE_TYPE_LABELS = {
  ticket_purchase: "Ticket Purchases",
  raffle_revenue: "Raffle Revenue", 
  raffle_creation: "Raffle Creation"
};

const SOURCE_TYPE_ICONS = {
  ticket_purchase: Activity,
  raffle_revenue: DollarSign,
  raffle_creation: TrendingUp
};

export function XPAnalyticsCard({ analytics }: XPAnalyticsCardProps) {
  if (!analytics) {
    return (
      <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">XP Analytics</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">XP Analytics</h3>
      </div>

      {/* Source Breakdown */}
      <div className="space-y-4 mb-6">
        <h4 className="text-sm font-medium text-muted-foreground">XP by Source Type</h4>
        <div className="space-y-3">
          {analytics.sourceBreakdown.map((source) => {
            const Icon = SOURCE_TYPE_ICONS[source.sourceType as keyof typeof SOURCE_TYPE_ICONS] || Activity;
            const label = SOURCE_TYPE_LABELS[source.sourceType as keyof typeof SOURCE_TYPE_LABELS] || source.sourceType;
            
            return (
              <div key={source.sourceType} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {source.recordCount} records • Avg: {source.avgXpPerRecord.toFixed(1)} XP
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{source.totalXp.toLocaleString()} XP</p>
                  <p className="text-xs text-muted-foreground">
                    ${source.totalUsdValue.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {analytics.recentActivity.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Recent Activity (Last 7 Days)</h4>
          <div className="space-y-2">
            {analytics.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.date} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/20 transition-colors">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(activity.date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.recordCount} XP awards
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    +{activity.dailyXp.toLocaleString()} XP
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.sourceBreakdown.length === 0 && analytics.recentActivity.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No XP activity yet</p>
          <p className="text-xs mt-1">XP will appear here once users start earning points</p>
        </div>
      )}
    </div>
  );
}