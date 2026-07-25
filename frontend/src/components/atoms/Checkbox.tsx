import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, "onCheckedChange" | "onChange" | "checked"> {
  label?: string;
  error?: boolean;
  description?: string;
  checked?: CheckedState;
  onChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxInputProps>(
  ({ label, error, description, className, checked, onChange, ...props }, ref) => {
    const errorStyles = error ? "border-[var(--destructive)]" : "";

    return (
      <div className={cn("flex items-start gap-[var(--spacing-md)]", className)}>
        <CheckboxPrimitive.Root
          ref={ref}
          checked={checked}
          onCheckedChange={onChange}
          className={cn(
            "peer h-5 w-5 shrink-0 rounded-[var(--radius-sm)]",
            "border border-[var(--input-border)]",
            "bg-[var(--input)]",
            "transition-all duration-[var(--transition-base)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]",
            "data-[state=indeterminate]:bg-[var(--primary)] data-[state=indeterminate]:border-[var(--primary)]",
            "hover:border-[var(--border-hover)]",
            errorStyles,
          )}
          {...props}
        >
          <CheckboxPrimitive.Indicator className="flex items-center justify-center">
            {checked === "indeterminate" ? (
              <Minus className="w-3.5 h-3.5 text-[var(--primary-foreground)]" strokeWidth={3} />
            ) : (
              <Check className="w-3.5 h-3.5 text-[var(--primary-foreground)]" strokeWidth={3} />
            )}
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {(label || description) && (
          <div className="grid gap-[var(--spacing-xs)] leading-none">
            {label && (
              <label className="text-sm font-medium text-[var(--foreground)] cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {label}
              </label>
            )}
            {description && <p className="text-xs text-[var(--foreground-muted)]">{description}</p>}
          </div>
        )}
      </div>
    );
  },
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
export default Checkbox;
