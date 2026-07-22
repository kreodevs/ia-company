import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps {
  variant?: "rounded" | "circular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "none";
  className?: string;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = "rounded", animation = "pulse", width, height, className }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-[var(--muted)]",
        animation === "pulse" && "animate-pulse",
        variant === "rounded" ? "rounded-[var(--radius-sm)]" : "rounded-full",
        className,
      )}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
      }}
    />
  ),
);

Skeleton.displayName = "Skeleton";

export default Skeleton;
