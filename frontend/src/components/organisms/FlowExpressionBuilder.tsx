import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { InputText } from '@/components/atoms/InputText'
import type { FlowTriggerVariable } from './flowEditorTypes'

const OPERATORS = [
  { value: 'eq', label: 'Igual (=)' },
  { value: 'neq', label: 'Distinto (≠)' },
  { value: 'contains', label: 'Contiene' },
  { value: 'gt', label: 'Mayor que (>)' },
  { value: 'lt', label: 'Menor que (<)' },
  { value: 'exists', label: 'Existe' },
]

export interface FlowExpressionBuilderProps {
  params: Record<string, unknown>
  triggerVariables?: FlowTriggerVariable[]
  onUpdate: (key: string, value: string | number) => void
  readOnly?: boolean
  className?: string
}

export function FlowExpressionBuilder({
  params,
  triggerVariables = [],
  onUpdate,
  readOnly = false,
  className,
}: FlowExpressionBuilderProps) {
  const field = String(params.field ?? '')
  const operator = String(params.operator ?? 'eq')
  const value = String(params.value ?? '')

  const preview = useMemo(() => {
    if (!field) return 'Define un campo para ver la expresión'
    if (operator === 'exists') return `${field} existe`
    return `${field} ${operator} "${value}"`
  }, [field, operator, value])

  const fieldValid = !field || triggerVariables.length === 0 || triggerVariables.some((v) => field.startsWith(v.path.split('.')[0]))

  return (
    <div className={cn('space-y-[var(--spacing-sm)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-[var(--spacing-sm)]', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
        Constructor de expresión
      </p>

      <div className="space-y-[var(--spacing-xs)]">
        <label className="text-[11px] font-medium text-[var(--foreground)]">Campo</label>
        <InputText
          value={field}
          onChange={(e) => onUpdate('field', e.target.value)}
          placeholder="ticket.priority"
          disabled={readOnly}
          fullWidth
          data-field-key="field"
          className={cn(!fieldValid && 'border-[var(--warning)]')}
        />
        {!fieldValid && (
          <p className="text-[9px] text-[var(--warning)]">Variable no reconocida en el trigger actual</p>
        )}
      </div>

      <div className="space-y-[var(--spacing-xs)]">
        <label className="text-[11px] font-medium text-[var(--foreground)]">Operador</label>
        <select
          value={operator}
          onChange={(e) => onUpdate('operator', e.target.value)}
          disabled={readOnly}
          className="w-full cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-xs text-[var(--foreground)] focus:border-[var(--input-focus)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60"
        >
          {OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {operator !== 'exists' && (
        <div className="space-y-[var(--spacing-xs)]">
          <label className="text-[11px] font-medium text-[var(--foreground)]">Valor</label>
          <InputText
            value={value}
            onChange={(e) => onUpdate('value', e.target.value)}
            placeholder="urgent"
            disabled={readOnly}
            fullWidth
            data-field-key="value"
          />
        </div>
      )}

      <div className="rounded-[var(--radius-sm)] bg-[var(--muted)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-mono text-[10px] text-[var(--foreground-muted)]">
        Preview: {preview}
      </div>
    </div>
  )
}

FlowExpressionBuilder.displayName = 'FlowExpressionBuilder'
export default FlowExpressionBuilder
