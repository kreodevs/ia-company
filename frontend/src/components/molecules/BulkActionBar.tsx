import { X } from 'lucide-react'
import { forwardRef, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'

export interface BulkAction<T = unknown> {
  id: string
  label: string
  icon?: ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
  onClick: (selected: T[]) => void
}

export interface BulkActionBarProps<T = unknown> {
  selectedCount: number
  selectedItems?: T[]
  actions: BulkAction<T>[]
  onClear?: () => void
  className?: string
  label?: (count: number) => string
}

export const BulkActionBar = forwardRef<HTMLDivElement, BulkActionBarProps>(
  (
    {
      selectedCount,
      selectedItems = [],
      actions,
      onClear,
      className,
      label = (n) => `${n} seleccionado${n === 1 ? '' : 's'}`,
    },
    ref,
  ) => {
    if (selectedCount <= 0) return null

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-wrap items-center gap-[var(--spacing-sm)] px-[var(--spacing-md)] py-[var(--spacing-sm)]',
          'bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-[var(--radius)]',
          'animate-in fade-in slide-in-from-top-[var(--spacing-xs)] duration-[var(--transition-base)]',
          className,
        )}
        role="region"
        aria-label="Acciones en lote"
      >
        <span className="text-body-sm font-medium text-[var(--foreground)] mr-[var(--spacing-sm)]">
          {label(selectedCount)}
        </span>
        {actions.map((action) => (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant={action.variant ?? 'outline'}
            onClick={() => action.onClick(selectedItems)}
            className="gap-[var(--spacing-xs)]"
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
        {onClear && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="ml-auto h-8 w-8"
            onClick={onClear}
            aria-label="Limpiar selección"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  },
)

BulkActionBar.displayName = 'BulkActionBar'

export default BulkActionBar
