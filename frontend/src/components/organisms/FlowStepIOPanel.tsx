import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FlowI18n } from './flowEditorTypes'
import type { FlowStepIOSummary } from '@/lib/flowStepIO'

export interface FlowStepIOPanelProps {
  summary: FlowStepIOSummary
  i18n?: FlowI18n
  className?: string
}

function IOSection({
  title,
  hint,
  icon: Icon,
  items,
  tone,
}: {
  title: string
  hint?: string
  icon: typeof ArrowUpFromLine
  items: FlowStepIOSummary['inputs']
  tone: 'input' | 'output'
}) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius)] border p-[var(--spacing-sm)]',
        tone === 'input'
          ? 'border-[var(--primary)]/20 bg-[var(--primary)]/5'
          : 'border-[var(--success)]/25 bg-[var(--success)]/5',
      )}
    >
      <div className="mb-[var(--spacing-xs)] flex items-start gap-[var(--spacing-xs)]">
        <Icon
          className={cn(
            'mt-[1px] h-3.5 w-3.5 shrink-0',
            tone === 'input' ? 'text-[var(--primary)]' : 'text-[var(--success)]',
          )}
          aria-hidden
        />
        <div>
          <h4 className="text-[11px] font-semibold text-[var(--foreground)]">{title}</h4>
          {hint ? <p className="text-[9px] leading-snug text-[var(--foreground-muted)]">{hint}</p> : null}
        </div>
      </div>
      <ul className="space-y-[var(--spacing-xs)]">
        {items.map((item) => (
          <li key={item.key} className="rounded-[var(--radius-sm)] bg-[var(--background)]/70 px-[var(--spacing-xs)] py-[2px]">
            <div className="flex flex-wrap items-baseline gap-x-[var(--spacing-xs)] gap-y-[1px]">
              <span className="text-[10px] font-medium text-[var(--foreground)]">{item.label}</span>
              {item.example ? (
                <code className="font-mono text-[9px] text-[var(--accent)]">{item.example}</code>
              ) : null}
            </div>
            {item.detail ? (
              <p className="text-[9px] leading-snug text-[var(--foreground-muted)]">{item.detail}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function FlowStepIOPanel({ summary, i18n, className }: FlowStepIOPanelProps) {
  return (
    <div className={cn('space-y-[var(--spacing-sm)]', className)}>
      <p className="text-[10px] leading-snug text-[var(--foreground-muted)]">
        {i18n?.stepIOHint
          ?? 'Los pasos no pasan datos por las flechas: comparten un objeto memoria (sharedMemory) que cada agente lee y escribe.'}
      </p>
      <IOSection
        title={i18n?.stepInputsTitle ?? 'Entrada — qué recibe este agente'}
        hint={i18n?.stepInputsHint ?? 'Se inyecta en system + user prompt al ejecutar el paso'}
        icon={ArrowDownToLine}
        items={summary.inputs}
        tone="input"
      />
      <IOSection
        title={i18n?.stepOutputsTitle ?? 'Salida — qué deja para el siguiente'}
        hint={i18n?.stepOutputsHint ?? 'El siguiente paso con memoria activa lee estas claves'}
        icon={ArrowUpFromLine}
        items={summary.outputs}
        tone="output"
      />
    </div>
  )
}

FlowStepIOPanel.displayName = 'FlowStepIOPanel'
export default FlowStepIOPanel
