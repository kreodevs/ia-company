import type { HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--radius-tags)] border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        success:
          "border-[var(--color-deep-teal)]/25 bg-[var(--color-mint-wall)] text-[var(--color-deep-teal)]",
        warning:
          "border-[var(--warning)]/25 bg-[var(--color-peach-wall)] text-[var(--warning)]",
        error:
          "border-[var(--destructive)]/25 bg-[var(--color-peach-wall)] text-[var(--destructive)]",
        info:
          "border-[var(--color-sapphire-blue)]/25 bg-[var(--color-lavender-wall)] text-[var(--color-sapphire-blue)]",
        neutral:
          "border-[var(--color-hairline)] bg-[var(--color-mist-white)] text-[var(--color-fog-gray)]",
        running:
          "border-[var(--color-electric-violet)]/25 bg-[var(--color-lavender-wall)] text-[var(--color-electric-violet)]",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      status: "neutral",
      size: "md",
    },
  },
);

export interface StatusPillProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {
  icon?: ReactNode;
}

export function StatusPill({ className, status, size, icon, children, ...props }: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ status, size }), className)} {...props}>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
}

export default StatusPill;
