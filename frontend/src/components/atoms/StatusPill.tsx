import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[var(--spacing-xxs)] text-xs font-semibold border transition-all duration-[var(--transition-base)]",
  {
    variants: {
      status: {
        success: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
        warning: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
        error: "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/20",
        info: "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20",
        neutral: "bg-[var(--secondary)] text-[var(--foreground-muted)] border-[var(--border)]",
        luxury: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 shadow-gold",
      },
      size: {
        sm: "px-[var(--spacing-sm)] py-0.25 text-[10px]",
        md: "px-2.5 py-[var(--spacing-xxs)] text-xs",
        lg: "px-[var(--spacing-md)] py-[var(--spacing-xs)] text-sm",
      },
    },
    defaultVariants: {
      status: "neutral",
      size: "md",
    },
  },
);

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusPillVariants> {
  icon?: React.ReactNode;
}

export function StatusPill({
  className,
  status,
  size,
  icon,
  children,
  ...props
}: StatusPillProps) {
  return (
    <div className={cn(statusPillVariants({ status, size, className }))} {...props}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </div>
  );
}

export default StatusPill;
