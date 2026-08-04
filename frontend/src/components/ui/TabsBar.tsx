import type { ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

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
  /** Pin tab row below the app header while scrolling long settings pages. */
  sticky?: boolean;
}

export default function TabsBar({ tabs, activeId, onChange, className, sticky }: TabsBarProps) {
  return (
    <Tabs.Root value={activeId} onValueChange={onChange} className={cn("w-full", className)}>
      <Tabs.List
        role="tablist"
        aria-orientation="horizontal"
        className={cn(
          "flex flex-wrap gap-[var(--spacing-md)] border-b border-[var(--border)]",
          sticky && "tabs-bar-sticky",
        )}
      >
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            role="tab"
            className={cn(
              "relative inline-flex items-center gap-2 pb-[var(--spacing-sm)] font-medium text-sm",
              "text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors outline-none",
              "data-[state=active]:text-[var(--accent)]",
              "data-[state=active]:after:absolute data-[state=active]:after:bottom-0",
              "data-[state=active]:after:left-0 data-[state=active]:after:right-0",
              "data-[state=active]:after:h-0.5 data-[state=active]:after:bg-[var(--accent)]",
              "data-[state=active]:after:rounded-full",
              "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
            )}
          >
            {tab.label}
            {tab.badge ? <span className="ml-0.5">{tab.badge}</span> : null}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
