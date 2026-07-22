import type { ReactNode } from "react";
import KreoEmptyState from "@/components/molecules/EmptyState";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <KreoEmptyState title={title} description={description}>
      {action ? <div className="flex justify-center">{action}</div> : null}
    </KreoEmptyState>
  );
}
