import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DashboardKPI } from "@/components/organisms/DashboardKPI";

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

export default function KpiCard({ label, value, delta, trend, series, className }: KpiCardProps) {
  const chartData =
    series && series.length > 1
      ? series.map((point) => ({ value: typeof point.y === "number" ? point.y : Number(point.y) }))
      : undefined;

  const trendValue = trend === "up" ? 1 : trend === "down" ? -1 : undefined;

  return (
    <DashboardKPI
      title={String(label)}
      value={String(value)}
      trend={trendValue}
      trendLabel={delta ? String(delta) : undefined}
      chartData={chartData}
      className={cn("kpi-card", className)}
    />
  );
}
