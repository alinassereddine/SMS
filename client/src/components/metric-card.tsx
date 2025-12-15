import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  iconClassName?: string;
  isLoading?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  iconClassName,
  isLoading = false 
}: MetricCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = trend && trend.value >= 0 ? TrendingUp : TrendingDown;
  const trendColorClass = trend && trend.value >= 0 
    ? "text-emerald-600 dark:text-emerald-400" 
    : "text-red-600 dark:text-red-400";

  return (
    <Card className="hover-elevate transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground" data-testid="text-metric-label">
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight" data-testid="text-metric-value">
              {value}
            </p>
            {trend && (
              <div className={cn("flex items-center gap-1 text-xs", trendColorClass)}>
                <TrendIcon className="h-3 w-3" />
                <span data-testid="text-metric-trend">
                  {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            iconClassName || "bg-primary/10 text-primary"
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
