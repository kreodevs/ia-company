import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: ReactNode;
  to?: string;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className={["flex flex-wrap items-center gap-1 text-xs", className].filter(Boolean).join(" ")}
    >
      {items.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {crumb.to ? (
            <Link
              to={crumb.to}
              className="interactive rounded px-1 py-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="px-1 py-0.5 font-medium text-[var(--color-foreground)]">
              {crumb.label}
            </span>
          )}
          {i < items.length - 1 ? (
            <ChevronRight
              className="h-3 w-3 text-[var(--color-muted-foreground)]"
              aria-hidden
            />
          ) : null}
        </span>
      ))}
    </nav>
  );
}