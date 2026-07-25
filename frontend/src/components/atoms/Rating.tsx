import { forwardRef, type HTMLAttributes } from "react";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RatingProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: number;
  onChange: (e: { value: number }) => void;
  stars?: number;
  cancel?: boolean;
  readOnly?: boolean;
  label?: string;
}

export const Rating = forwardRef<HTMLDivElement, RatingProps>(
  ({ value = 0, onChange, stars = 5, cancel = false, readOnly = false, className, label, ...props }, ref) => {
    const handleClick = (starValue: number) => {
      if (readOnly) return;
      const newValue = starValue === value && cancel ? 0 : starValue;
      onChange?.({ value: newValue });
    };

    return (
      <div ref={ref} className="flex flex-col gap-1.5" {...props}>
        {label && <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>}
        <div className={cn("flex items-center gap-1", className)}>
          {Array.from({ length: stars }, (_, i) => i + 1).map((starValue) => (
            <button
              key={starValue}
              type="button"
              disabled={readOnly}
              onClick={() => handleClick(starValue)}
              className={cn(
                "outline-none rounded-full transition-transform",
                !readOnly &&
                  "cursor-pointer hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                readOnly && "cursor-default",
              )}
              aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "w-6 h-6 transition-colors",
                  starValue <= value
                    ? "text-[var(--primary)] fill-[var(--primary)]"
                    : "text-[var(--border)] hover:text-[var(--primary)]/50",
                )}
              />
            </button>
          ))}
          {cancel && value > 0 && (
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onChange?.({ value: 0 })}
              className={cn(
                "outline-none rounded-full transition-opacity",
                !readOnly && "cursor-pointer hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                readOnly && "cursor-default",
              )}
              aria-label="Clear rating"
            >
              <X className="w-5 h-5 text-[var(--destructive)] ml-[var(--spacing-sm)]" />
            </button>
          )}
        </div>
      </div>
    );
  },
);
Rating.displayName = "Rating";
