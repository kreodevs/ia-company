import { CheckCircle2, Circle, Loader2, MinusCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FlowExecutionStep, FlowI18n } from './flowEditorTypes'

export interface FlowExecutionTraceProps {
  steps: FlowExecutionStep[]
  i18n?: FlowI18n
  className?: string
}

export function FlowExecutionTrace({ steps, i18n, className }: FlowExecutionTraceProps) {
  if (steps.length === 0) return null

  const title = i18n?.traceTitle ?? 'Trace'
  const skippedLabel = i18n?.traceSkipped ?? 'skipped'
  const branchLabel = i18n?.traceBranch ?? 'branch'

  return (
    <div
      className={cn(
        'max-h-[180px] space-y-[var(--spacing-xs)] overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-[var(--spacing-sm)]',
        className,
      )}
      role="log"
      aria-live="polite"
      aria-label={title}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
        {title} ({steps.length})
      </p>
      {steps.map((step, index) => (
        <div
          key={`${step.nodeId}-${step.timestamp}-${index}`}
          className={cn(
            'flex items-start gap-[var(--spacing-xs)] text-[10px]',
            step.skipped && 'opacity-60',
          )}
        >
          <span className="mt-[1px] shrink-0" aria-hidden>
            {step.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-[var(--primary)]" />}
            {step.status === 'success' && !step.skipped && <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />}
            {step.status === 'error' && <XCircle className="h-3 w-3 text-[var(--destructive)]" />}
            {(step.status === 'skipped' || step.skipped) && <MinusCircle className="h-3 w-3 text-[var(--foreground-muted)]" />}
            {step.status === 'idle' && <Circle className="h-3 w-3 text-[var(--foreground-muted)]" />}
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-[var(--foreground)]">{step.label}</span>
            <span className="ml-[var(--spacing-xs)] text-[var(--foreground-muted)]">({step.semanticType})</span>
            {step.branch && (
              <span className="ml-[var(--spacing-xs)] rounded-full bg-[var(--accent)]/15 px-[var(--spacing-xs)] py-[1px] text-[9px] text-[var(--accent)]">
                {branchLabel}: {step.branchLabel ?? step.branch}
              </span>
            )}
            {step.skipped && (
              <span className="ml-[var(--spacing-xs)] text-[9px] uppercase text-[var(--foreground-muted)]">
                {skippedLabel}
              </span>
            )}
            {step.message && (
              <p className="truncate text-[var(--foreground-muted)]">{step.message}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

FlowExecutionTrace.displayName = 'FlowExecutionTrace'
export default FlowExecutionTrace
