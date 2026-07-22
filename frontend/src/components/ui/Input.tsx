import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = "", id, ...props }: InputProps) {
  const inputId = id ?? (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);
  const field = (
    <input
      id={inputId}
      className={`interactive w-full min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-sm sm:min-h-9 sm:py-2 ${className}`}
      {...props}
    />
  );

  if (!label) return field;

  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-[var(--color-foreground)]">{label}</span>
      {field}
    </label>
  );
}
