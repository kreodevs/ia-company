import { forwardRef, type ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { FlowNodeExecutionStatus } from './flowEditorTypes'
import { FlowNodeExecuteButton, FlowNodeExecutionBadge } from './FlowNodeExecuteControl'

export type FlowNodeColorVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent'
  | 'secondary'
  | 'muted'

const VARIANT_STYLES: Record<
  FlowNodeColorVariant,
  { bg: string; fg: string; border: string; ring: string }
> = {
  primary: {
    bg: 'bg-[var(--primary)]',
    fg: 'text-[var(--primary-foreground)]',
    border: 'border-[var(--primary-foreground)]',
    ring: 'ring-[var(--primary)]',
  },
  success: {
    bg: 'bg-[var(--success)]',
    fg: 'text-[var(--success-foreground)]',
    border: 'border-[var(--success-foreground)]',
    ring: 'ring-[var(--success)]',
  },
  warning: {
    bg: 'bg-[var(--warning)]',
    fg: 'text-[var(--warning-foreground)]',
    border: 'border-[var(--warning-foreground)]',
    ring: 'ring-[var(--warning)]',
  },
  info: {
    bg: 'bg-[var(--info)]',
    fg: 'text-[var(--info-foreground)]',
    border: 'border-[var(--info-foreground)]',
    ring: 'ring-[var(--info)]',
  },
  accent: {
    bg: 'bg-[var(--accent)]',
    fg: 'text-[var(--accent-foreground)]',
    border: 'border-[var(--accent-foreground)]',
    ring: 'ring-[var(--accent)]',
  },
  secondary: {
    bg: 'bg-[var(--secondary)]',
    fg: 'text-[var(--secondary-foreground)]',
    border: 'border-[var(--border)]',
    ring: 'ring-[var(--ring)]',
  },
  muted: {
    bg: 'bg-[var(--muted)]',
    fg: 'text-[var(--muted-foreground)]',
    border: 'border-[var(--border)]',
    ring: 'ring-[var(--ring)]',
  },
}

export interface FlowNodeShellProps {
  id: string
  selected?: boolean
  variant: FlowNodeColorVariant
  icon: ReactNode
  label: string
  executeLabel?: string
  dispatchable?: boolean
  executionStatus?: FlowNodeExecutionStatus
  dashed?: boolean
  showTargetHandle?: boolean
  showSourceHandle?: boolean
  sourceHandles?: Array<{ id?: string; label?: string; leftPercent: number; color?: string }>
  children?: ReactNode
  footer?: ReactNode
  className?: string
  'aria-label'?: string
}

export const FlowNodeShell = forwardRef<HTMLDivElement, FlowNodeShellProps>(
  (
    {
      id,
      selected,
      variant,
      icon,
      label,
      executeLabel = 'Probar',
      dispatchable = true,
      executionStatus,
      dashed = false,
      showTargetHandle = true,
      showSourceHandle = true,
      sourceHandles,
      children,
      footer,
      className,
      'aria-label': ariaLabel,
    },
    ref,
  ) => {
    const styles = VARIANT_STYLES[variant]
    const handleClass = cn(
      '!h-3 !w-3 !border-2',
      `!border-[${variant}-foreground]/60`,
      `!bg-[var(--background)]/40`,
    )

    return (
      <div
        ref={ref}
        role="group"
        aria-label={ariaLabel ?? `Nodo: ${label}`}
        tabIndex={0}
        className={cn(
          'min-w-[160px] rounded-[var(--radius)] border-2 px-[var(--spacing-md)] py-[var(--spacing-sm)] text-center text-sm font-medium shadow-md',
          'transition-all duration-[var(--transition-base)]',
          'hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          styles.bg,
          styles.fg,
          dashed && 'border-dashed',
          selected
            ? cn('scale-105 ring-2 ring-offset-2 ring-offset-[var(--background)]', styles.ring, styles.border)
            : cn('border-opacity-20', styles.border),
          executionStatus === 'running' && 'animate-pulse motion-reduce:animate-none',
          className,
        )}
      >
        {showTargetHandle && (
          <Handle
            type="target"
            position={Position.Top}
            aria-label="Entrada"
            className={cn(handleClass, '!border-current/60 !bg-current/40')}
          />
        )}

        <div className="flex items-center justify-center gap-[var(--spacing-xs)]">
          <span className="shrink-0" aria-hidden>
            {icon}
          </span>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <FlowNodeExecuteButton node={{ id }} dispatchable={dispatchable} label={executeLabel} />
        </div>

        {children}

        {footer}

        <div className="mt-[var(--spacing-xs)] flex justify-center">
          <FlowNodeExecutionBadge status={executionStatus} />
        </div>

        {sourceHandles ? (
          <>
            {sourceHandles.map((handle) => (
              <Handle
                key={handle.id ?? String(handle.leftPercent)}
                type="source"
                position={Position.Bottom}
                id={handle.id}
                style={{
                  left: `${handle.leftPercent}%`,
                  ...(handle.color
                    ? { borderColor: handle.color, backgroundColor: handle.color }
                    : {}),
                }}
                aria-label={handle.label ?? 'Salida'}
                className="!h-3 !w-3 !border-2 !border-current/60 !bg-current/40"
              />
            ))}
          </>
        ) : showSourceHandle ? (
          <Handle
            type="source"
            position={Position.Bottom}
            aria-label="Salida"
            className={cn(handleClass, '!border-current/60 !bg-current/40')}
          />
        ) : null}
      </div>
    )
  },
)

FlowNodeShell.displayName = 'FlowNodeShell'

export default FlowNodeShell
