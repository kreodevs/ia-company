import React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
    title: React.ReactNode
    description?: React.ReactNode
    breadcrumbs?: React.ReactNode
    actions?: React.ReactNode
    className?: string
}

export const PageHeader = ({ title, description, breadcrumbs, actions, className }: PageHeaderProps) => {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-start justify-between gap-[var(--spacing-md)] mb-[var(--spacing-xl)]", className)}>
            <div className="flex flex-col gap-[var(--spacing-xs)]">
                {breadcrumbs && <div className="mb-[var(--spacing-sm)]">{breadcrumbs}</div>}
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--foreground)]">
                    {title}
                </h1>
                {description && (
                    <p className="text-[var(--foreground-muted)] text-sm mt-[var(--spacing-xs)] max-w-2xl">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-[var(--spacing-md)] shrink-0">
                    {actions}
                </div>
            )}
        </div>
    )
}

export default PageHeader
