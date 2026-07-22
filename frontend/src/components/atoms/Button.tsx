import { Loader2 } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-buttons)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
        secondary:
          "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]",
        outline:
          "border border-[var(--foreground)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
        ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
        destructive:
          "border border-[var(--destructive)]/30 text-[var(--destructive)] hover:bg-[var(--destructive)]/10",
        link: "bg-transparent p-0 h-auto text-[var(--accent)] hover:underline underline-offset-4",
        violet:
          "bg-[var(--color-electric-violet)] text-[var(--color-paper-white)] hover:opacity-90",
        blue: "bg-[var(--color-sapphire-blue)] text-[var(--color-paper-white)] hover:opacity-90",
      },
      size: {
        default:
          "min-h-11 px-[var(--button-padding-x)] py-[var(--button-padding-y)] text-[length:var(--button-font-size)] font-medium sm:min-h-9",
        sm: "min-h-9 px-4 py-2 text-sm",
        lg: "min-h-12 px-8 py-3 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, loading, disabled, children, className, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  ),
);

Button.displayName = "Button";

export { buttonVariants };
export default Button;
