import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[60px] w-full rounded-[var(--radius)] border border-[var(--input-border)] bg-[var(--input)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm text-[var(--foreground)] shadow-sm transition-colors duration-[var(--transition-base)] placeholder:text-[var(--foreground-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-[var(--input-focus)] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--muted)]",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea }
