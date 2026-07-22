import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export interface InputTextProps extends ComponentPropsWithoutRef<"input"> {
  error?: boolean;
  fullWidth?: boolean;
  label?: string;
}

export const InputText = forwardRef<HTMLInputElement, InputTextProps>(
  ({ error, fullWidth = true, label, className, id, ...props }, ref) => {
    const resolvedId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const input = (
      <input
        ref={ref}
        id={resolvedId}
        className={cn(
          "flex min-h-11 w-full rounded-[var(--radius-inputs)] border border-[var(--input-border)] bg-[var(--input)] px-4 py-2.5 text-base text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] transition-colors duration-150 focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9 sm:text-sm",
          error && "border-[var(--destructive)] focus:ring-[var(--destructive)]",
          !fullWidth && "w-auto",
          className,
        )}
        {...props}
      />
    );

    if (!label) return input;

    return (
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-[var(--foreground)]">{label}</span>
        {input}
      </label>
    );
  },
);

InputText.displayName = "InputText";

export default InputText;
