interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary";
}

export default function Badge({ children, variant = "default" }: BadgeProps) {
  const classes =
    variant === "primary"
      ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
      : "border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs capitalize ${classes}`}>
      {children}
    </span>
  );
}
