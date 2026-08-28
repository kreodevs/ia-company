import { forwardRef, ReactNode } from 'react'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { Card } from './Card'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/atoms/Skeleton'

export interface StatsCardProps {
    title: string
    value: string | number
    description?: string
    trend?: {
        value: number | string
        label?: string
        direction: 'up' | 'down' | 'neutral'
    }
    icon?: ReactNode
    className?: string
    variant?: 'default' | 'bordered' | 'elevated'
    loading?: boolean
}

export const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
    ({ title, value, description, trend, icon, className, variant: _variant = 'default', loading = false }, ref) => {
        const isUp = trend?.direction === 'up'
        const isDown = trend?.direction === 'down'

        if (loading) {
            return (
                <Card
                    ref={ref}
                    className={cn("relative overflow-hidden", className)}
                >
                    <div className="flex items-start justify-between">
                        <div className="space-y-[var(--spacing-xs)]">
                            <Skeleton width="100px" height="0.875rem" animation="pulse" />
                            <Skeleton width="60px" height="1.5rem" animation="pulse" />
                        </div>
                        <Skeleton width="40px" height="40px" variant="circular" animation="pulse" />
                    </div>

                    <div className="mt-[var(--spacing-md)] flex items-center gap-[var(--spacing-sm)]">
                        <Skeleton width="80px" height="1.25rem" animation="pulse" variant="rounded" />
                        <Skeleton width="120px" height="0.75rem" animation="pulse" />
                    </div>

                    {/* Subtle decorative element */}
                    <div className="absolute -right-[var(--spacing-sm)] -bottom-[var(--spacing-sm)] w-16 h-16 bg-[var(--primary)] opacity-[0.03] rounded-full blur-2xl" />
                </Card>
            )
        }

        return (
            <Card
                ref={ref}
                className={cn("relative overflow-hidden", className)}
            >
                <div className="flex items-start justify-between">
                    <div className="space-y-[var(--spacing-xs)]">
                        <p className="text-sm font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-[var(--spacing-sm)]">
                            <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                                {value}
                            </h3>
                        </div>
                    </div>
                    {icon && (
                        <div className="p-[var(--spacing-sm)] bg-[var(--background-tertiary)] rounded-lg text-[var(--primary)] border border-[var(--border)]">
                            {icon}
                        </div>
                    )}
                </div>

                {(trend || description) && (
                    <div className="mt-[var(--spacing-md)] flex items-center gap-[var(--spacing-sm)]">
                        {trend && (
                            <div className={cn(
                                "flex items-center text-xs font-semibold px-[var(--spacing-xs)] py-[var(--spacing-xxs)] rounded-md",
                                isUp && "text-[var(--success)] bg-[var(--success)]/10",
                                isDown && "text-[var(--destructive)] bg-[var(--destructive)]/10",
                                !isUp && !isDown && "text-[var(--foreground-muted)] bg-[var(--secondary)]"
                            )}>
                                {isUp && <ArrowUpRight className="w-3 h-3 mr-[var(--spacing-xxs)]" />}
                                {isDown && <ArrowDownRight className="w-3 h-3 mr-[var(--spacing-xxs)]" />}
                                {!isUp && !isDown && <Minus className="w-3 h-3 mr-[var(--spacing-xxs)]" />}
                                {trend.value}
                            </div>
                        )}
                        {description && (
                            <p className="text-xs text-[var(--foreground-subtle)] truncate">
                                {trend?.label || description}
                            </p>
                        )}
                    </div>
                )}

                {/* Subtle decorative element */}
                <div className="absolute -right-[var(--spacing-sm)] -bottom-[var(--spacing-sm)] w-16 h-16 bg-[var(--primary)] opacity-[0.03] rounded-full blur-2xl" />
            </Card>
        )
    }
)

StatsCard.displayName = 'StatsCard'

export default StatsCard
