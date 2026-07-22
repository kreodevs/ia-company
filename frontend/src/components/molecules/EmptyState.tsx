import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/atoms/Button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Search,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-[var(--radius-cards)] border border-dashed border-[var(--color-hairline)] bg-[var(--color-mist-white)] px-6 py-10 text-center sm:py-12",
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-paper-white)] text-[var(--color-fog-gray)]">
        <Icon className="h-7 w-7 opacity-60" aria-hidden />
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-[length:var(--text-subheading)] font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--foreground-muted)]">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {action ? (
        <Button onClick={action.onClick} variant="outline" className="mt-4 gap-2">
          {action.icon}
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
