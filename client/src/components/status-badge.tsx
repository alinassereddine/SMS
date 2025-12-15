import { Badge } from "@/components/ui/badge";
import { cn, getStatusColor } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = getStatusColor(status);
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize border-0",
        colorClass,
        className
      )}
      data-testid={`badge-status-${status.toLowerCase()}`}
    >
      {status}
    </Badge>
  );
}
