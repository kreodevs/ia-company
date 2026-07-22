interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      {hint ? (
        <div className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">{hint}</div>
      ) : null}
    </div>
  );
}
