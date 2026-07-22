import type { HTMLAttributes, ReactNode } from "react";
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
  const bodyPadding =
    bodySize === "flush"
      ? "app-panel-body--flush"
      : bodySize === "sm"
        ? "app-panel-body--sm"
        : "";
  const toneClass = tone === "warn" ? "!bg-amber-50 !border-amber-300 text-amber-900" : "";

  return (
    <section
      className={cn(
        "app-panel",
        hover && "app-panel-hover",
        toneClass,
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <header
          className={cn(
            "app-panel-header",
            stickyHeader && "app-panel-header--sticky",
          )}
        >
          <div className="min-w-0">
            {title && <h2 className="app-panel-title">{title}</h2>}
            {subtitle && <p className="app-panel-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="app-panel-actions">{actions}</div>}
        </header>
      )}
      <div className={cn("app-panel-body", bodyPadding, bodyClassName)}>{children}</div>
    </section>
  );
}