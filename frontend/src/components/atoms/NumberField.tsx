import { Minus, Plus } from 'lucide-react'
import { forwardRef, useCallback, type ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'

export interface NumberFieldProps extends Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'onChange' | 'type'> {
  value?: number | null
  onChange?: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  label?: string
  error?: boolean
  fullWidth?: boolean
  showSteppers?: boolean
  formatDisplay?: (value: number | null) => string
}

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      step = 1,
      label,
      error,
      fullWidth = true,
      showSteppers = true,
      formatDisplay,
      className,
      disabled,
      id,
      ...props
    },
    ref,
  ) => {
    const resolvedId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    const clamp = useCallback(
      (next: number) => {
        let v = next
        if (min !== undefined) v = Math.max(min, v)
        if (max !== undefined) v = Math.min(max, v)
        return v
      },
      [min, max],
    )

    const handleChange = useCallback(
      (raw: string) => {
        if (!raw.trim()) {
          onChange?.(null)
          return
        }
        const parsed = Number(raw)
        if (Number.isNaN(parsed)) return
        onChange?.(clamp(parsed))
      },
      [clamp, onChange],
    )

    const bump = useCallback(
      (delta: number) => {
        const base = value ?? 0
        onChange?.(clamp(base + delta))
      },
      [clamp, onChange, value],
    )

    const displayValue =
      value == null ? '' : formatDisplay ? formatDisplay(value) : String(value)

    const input = (
      <div
        className={cn(
          'inline-flex items-stretch rounded-[var(--radius)] border border-[var(--input-border)] bg-[var(--input)] overflow-hidden',
          'focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--ring-offset)] focus-within:border-[var(--input-focus)]',
          error && 'border-[var(--destructive)] focus-within:ring-[var(--destructive)]',
          fullWidth && 'w-full',
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
      >
        {showSteppers && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-none border-r border-[var(--border)]"
            onClick={() => bump(-step)}
            disabled={disabled || (min !== undefined && (value ?? 0) <= min)}
            aria-label="Disminuir"
          >
            <Minus className="w-4 h-4" />
          </Button>
        )}
        <input
          ref={ref}
          id={resolvedId}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'flex-1 min-w-0 h-10 bg-transparent px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm text-[var(--foreground)]',
            'placeholder:text-[var(--foreground-muted)] focus:outline-none',
          )}
          {...props}
        />
        {showSteppers && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-none border-l border-[var(--border)]"
            onClick={() => bump(step)}
            disabled={disabled || (max !== undefined && (value ?? 0) >= max)}
            aria-label="Aumentar"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
    )

    if (!label) return input

    return (
      <div className={cn('flex flex-col gap-[var(--spacing-xs)]', fullWidth && 'w-full')}>
        <label htmlFor={resolvedId} className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
        {input}
      </div>
    )
  },
)

NumberField.displayName = 'NumberField'

export default NumberField
