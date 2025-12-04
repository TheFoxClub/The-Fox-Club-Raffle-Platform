import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  trend?: "up" | "down";
}

export function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  return (
    <div className="glass-card p-6 rounded-xl border border-border/50 hover:border-primary/50 transition-all hover:glow-primary">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-lg bg-gradient-primary/10 text-primary">
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
            {trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-sm text-muted-foreground mb-2">{title}</h3>
      <p className="text-3xl font-bold text-gradient">{value}</p>
    </div>
  );
}
