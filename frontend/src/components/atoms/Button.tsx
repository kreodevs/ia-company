import { Loader2 } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[var(--spacing-sm)] font-medium rounded-[var(--radius)] transition-all duration-[var(--transition-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] shadow-sm",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--muted)] border border-[var(--border)]",
        outline:
          "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--secondary)] hover:border-[var(--border-hover)]",
        ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--secondary)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90 shadow-sm",
        link: "bg-transparent text-[var(--primary)] hover:underline underline-offset-4",
      },
      size: {
        default: "h-10 px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm",
        sm: "h-8 px-[var(--spacing-md)] text-xs",
        lg: "h-12 px-[var(--spacing-lg)] text-base",
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
  ({ variant, size, loading, disabled, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { buttonVariants };
export default Button;
