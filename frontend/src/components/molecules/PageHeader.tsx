import React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
    title: React.ReactNode
    description?: React.ReactNode
    breadcrumbs?: React.ReactNode
    actions?: React.ReactNode
    className?: string
    variant?: "default" | "command"
}

export const PageHeader = ({
    title,
    description,
    breadcrumbs,
    actions,
    className,
    variant = "default",
}: PageHeaderProps) => {
    const isCommand = variant === "command"

    return (
        <div
            className={cn(
                "page-header flex flex-col md:flex-row md:items-start justify-between gap-[var(--spacing-md)] mb-[var(--spacing-xl)]",
                isCommand && "page-header--command",
                className,
            )}
        >
            <div className="flex min-w-0 flex-col gap-[var(--spacing-xs)]">
                {breadcrumbs && (
                    <div className={cn("mb-[var(--spacing-sm)]", isCommand && "page-header-eyebrow")}>
                        {breadcrumbs}
                    </div>
                )}
                <h1
                    className={cn(
                        "page-header-title text-2xl md:text-3xl font-bold tracking-tight text-[var(--foreground)]",
                        isCommand && "md:text-[clamp(1.625rem,3.2vw,2.125rem)]",
                    )}
                >
                    {title}
                </h1>
                {description && (
                    <p
                        className={cn(
                            "page-header-description text-[var(--foreground-muted)] text-sm mt-[var(--spacing-xs)] max-w-2xl",
                            isCommand && "text-[0.9375rem] max-w-[42rem]",
                        )}
                    >
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-[var(--spacing-md)] shrink-0">
                    {actions}
                </div>
            )}
        </div>
    )
}

export default PageHeader
