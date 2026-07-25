import type { ReactNode } from "react";
import KreoEmptyState from "@/components/molecules/EmptyState";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  if (!action) {
    return <KreoEmptyState title={title} description={description} />;
  }

  return (
    <div className="flex flex-col items-center gap-[var(--spacing-lg)]">
      <KreoEmptyState title={title} description={description} className="min-h-0 w-full border-0 bg-transparent p-0" />
      <div className="flex justify-center">{action}</div>
    </div>
  );
}
