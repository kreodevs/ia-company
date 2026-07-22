import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 border-transparent",
  secondary:
    "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
  ghost:
    "border-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
  destructive:
    "border-[var(--color-destructive)]/40 text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
  fullWidthMobile?: boolean;
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  fullWidthMobile = false,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`interactive inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 sm:min-h-9 sm:py-2 ${variantClasses[variant]} ${fullWidthMobile ? "w-full sm:w-auto" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
