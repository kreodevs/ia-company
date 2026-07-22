import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-tags)] border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-hairline)] bg-[var(--color-mist-white)] text-[var(--color-vault-ink)]",
        primary:
          "border-[var(--color-deep-teal)]/30 bg-[var(--color-deep-teal)]/10 text-[var(--color-deep-teal)]",
        secondary:
          "border-[var(--color-hairline)] bg-[var(--color-paper-white)] text-[var(--color-fog-gray)]",
        destructive:
          "border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]",
        outline: "border-[var(--color-hairline)] text-[var(--color-vault-ink)]",
        mint: "border-transparent bg-[var(--color-mint-wall)] text-[var(--color-vault-ink)]",
        peach: "border-transparent bg-[var(--color-peach-wall)] text-[var(--color-vault-ink)]",
        lavender:
          "border-transparent bg-[var(--color-lavender-wall)] text-[var(--color-vault-ink)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
export default Badge;
