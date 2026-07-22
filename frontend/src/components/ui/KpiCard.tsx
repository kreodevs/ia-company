import type { ReactNode } from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { cn } from "@/lib/utils";

export interface SparklinePoint {
  x: number | string;
  y: number;
}

export interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  trend?: "up" | "down" | "flat";
  series?: SparklinePoint[];
  className?: string;
}

export default function KpiCard({
  label,
  value,
  delta,
  trend,
  series,
  className,
}: KpiCardProps) {
  const hasSeries = !!series && series.length > 1;
  const seriesData = hasSeries ? series : undefined;

  return (
    <div className={cn("kpi-card", className)}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value" title={typeof value === "string" ? value : undefined}>
        {value}
      </p>
      {delta && (
        <p
          className={cn(
            "kpi-delta",
            trend === "up" && "kpi-delta--up",
            trend === "down" && "kpi-delta--down",
          )}
        >
          {trend === "up" && <span aria-hidden>↑</span>}
          {trend === "down" && <span aria-hidden>↓</span>}
          {delta}
        </p>
      )}
      {seriesData && (
        <div className="kpi-spark" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={seriesData}>
              <defs>
                <linearGradient id="kpiSparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="y"
                stroke="var(--color-primary)"
                strokeWidth={1.5}
                fill="url(#kpiSparkFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}