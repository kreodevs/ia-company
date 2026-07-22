const statusStyles: Record<string, string> = {
  PENDING: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  RUNNING: "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  COMPLETED: "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
  FAILED: "border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]",
  CANCELLED: "border-[var(--color-border)] bg-[var(--color-muted)]/50 text-[var(--color-muted-foreground)]",
};

interface StatusBadgeProps {
  status: string;
  label: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[status] ?? statusStyles.CANCELLED}`}
    >
      {label}
    </span>
  );
}
