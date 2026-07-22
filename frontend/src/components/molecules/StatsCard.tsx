import { forwardRef, type ReactNode } from "react";
import { Card } from "@/components/molecules/Card";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";

export interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  className?: string;
  tint?: "none" | "peach" | "mint" | "lavender" | "mist";
  loading?: boolean;
}

export const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
  ({ title, value, description, icon, className, tint = "mist", loading = false }, ref) => {
    if (loading) {
      return (
        <Card ref={ref} tint={tint} className={className}>
          <div className="space-y-3">
            <Skeleton width="100px" height="0.875rem" />
            <Skeleton width="80px" height="1.75rem" />
            <Skeleton width="140px" height="0.75rem" />
          </div>
        </Card>
      );
    }

    return (
      <Card ref={ref} tint={tint} padding="md" className={cn(className)}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
              {title}
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums text-[var(--foreground)]">
              {value}
            </p>
            {description ? (
              <p className="text-xs leading-relaxed text-[var(--foreground-muted)]">{description}</p>
            ) : null}
          </div>
          {icon ? (
            <div className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper-white)] p-2 text-[var(--color-deep-teal)]">
              {icon}
            </div>
          ) : null}
        </div>
      </Card>
    );
  },
);

StatsCard.displayName = "StatsCard";

export default StatsCard;
