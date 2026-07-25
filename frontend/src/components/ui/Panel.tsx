import type { HTMLAttributes, ReactNode } from "react";
import { Card as KreoCard } from "@/components/molecules/Card";
import { cn } from "@/lib/utils";

type PanelProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  bodyClassName?: string;
  bodySize?: "sm" | "md" | "flush";
  hover?: boolean;
  stickyHeader?: boolean;
  tone?: "default" | "warn";
};

export default function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  bodySize = "md",
  hover = false,
  stickyHeader = false,
  tone = "default",
  ...rest
}: PanelProps) {
  const hasHeader = title !== undefined || subtitle !== undefined || actions !== undefined;
  const padding = bodySize === "flush" ? "none" : bodySize === "sm" ? "sm" : "md";
  const toneClass = tone === "warn" ? "!bg-amber-50 !border-amber-300 text-amber-900" : "";

  return (
    <KreoCard
      padding="none"
      className={cn("app-panel", hover && "app-panel-hover", toneClass, className)}
      {...rest}
    >
      {hasHeader && (
        <header
          className={cn(
            "app-panel-header flex items-start justify-between gap-3 border-b border-[var(--color-hairline)] px-[var(--card-padding)] py-3",
            stickyHeader && "app-panel-header--sticky sticky top-0 z-10 bg-[var(--card)]",
          )}
        >
          <div className="min-w-0">
            {title && <h2 className="app-panel-title">{title}</h2>}
            {subtitle && <p className="app-panel-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="app-panel-actions shrink-0">{actions}</div>}
        </header>
      )}
      <div
        className={cn(
          "app-panel-body",
          padding === "none" && "app-panel-body--flush",
          padding === "sm" && "app-panel-body--sm",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </KreoCard>
  );
}
