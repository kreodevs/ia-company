import { type ReactNode, forwardRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  to?: string;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(({ items, className }, ref) => {
  const isLast = (index: number) => index === items.length - 1;

  return (
    <nav ref={ref} aria-label="Breadcrumb" className={cn("overflow-x-auto", className)}>
      <ol className="flex items-center list-none p-0 m-0 gap-[var(--spacing-sm)]">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-[var(--spacing-sm)]">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-[var(--foreground-subtle)] shrink-0" aria-hidden="true" />
            )}

            {isLast(index) ? (
              <span
                className="text-sm font-medium text-[var(--foreground)] leading-none flex items-center gap-1.5"
                aria-current="page"
              >
                {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                {item.label}
              </span>
            ) : item.to ? (
              <Link
                to={item.to}
                className="text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors duration-[var(--transition-fast)] no-underline flex items-center gap-1.5 whitespace-nowrap"
              >
                {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                {item.label}
              </Link>
            ) : item.href ? (
              <a
                href={item.href}
                className="text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors duration-[var(--transition-fast)] no-underline flex items-center gap-1.5 whitespace-nowrap"
              >
                {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                {item.label}
              </a>
            ) : (
              <span className="text-sm font-medium text-[var(--foreground-muted)] leading-none flex items-center gap-1.5 whitespace-nowrap">
                {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
});

Breadcrumb.displayName = "Breadcrumb";

export default Breadcrumb;
