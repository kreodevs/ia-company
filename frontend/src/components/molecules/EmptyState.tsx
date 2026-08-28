import * as React from "react"
import { type LucideIcon, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from '../atoms/Button'

export interface EmptyStateProps {
    title: string
    description?: string
    icon?: LucideIcon
    action?: {
        label: string
        onClick: () => void
        icon?: React.ReactNode
    }
    className?: string
}

export function EmptyState({
    title,
    description,
    icon: Icon = Search,
    action,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-[var(--spacing-xl)] text-center bg-[var(--background-secondary)] rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed min-h-[300px]",
            className
        )}>
            <div className="flex items-center justify-center w-16 h-16 mb-[var(--spacing-md)] rounded-full bg-[var(--secondary)] text-[var(--foreground-subtle)]">
                <Icon className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-[var(--spacing-xs)]">
                {title}
            </h3>
            {description && (
                <p className="max-w-[300px] text-sm text-[var(--foreground-muted)] mb-[var(--spacing-lg)]">
                    {description}
                </p>
            )}
            {action && (
                <Button onClick={action.onClick} variant="outline" className="gap-[var(--spacing-sm)]">
                    {action.icon}
                    {action.label}
                </Button>
            )}
        </div>
    )
}

export default EmptyState
