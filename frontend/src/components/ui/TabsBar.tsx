import type { ReactNode } from "react";

export interface TabSpec {
  id: string;
  label: ReactNode;
  badge?: ReactNode;
}

export interface TabsBarProps {
  tabs: TabSpec[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function TabsBar({ tabs, activeId, onChange, className }: TabsBarProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={[
        "flex flex-wrap gap-1 border-b border-[var(--color-border)]",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`interactive inline-flex items-center gap-2 rounded-t-md px-3 py-2 text-sm font-medium transition ${
              active
                ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-b-2 border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            {tab.label}
            {tab.badge ? <span className="ml-0.5">{tab.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}