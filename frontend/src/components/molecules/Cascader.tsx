import { ChevronRight } from 'lucide-react'
import { forwardRef, useCallback, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/molecules/Popover'

export interface CascaderOption {
  value: string | number
  label: string
  children?: CascaderOption[]
  disabled?: boolean
}

export interface CascaderProps {
  options: CascaderOption[]
  value?: (string | number)[]
  onChange?: (value: (string | number)[], labels: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  fullWidth?: boolean
}

function findPathLabels(options: CascaderOption[], path: (string | number)[]): string[] {
  const labels: string[] = []
  let current = options
  for (const segment of path) {
    const node = current.find((o) => o.value === segment)
    if (!node) break
    labels.push(node.label)
    current = node.children ?? []
  }
  return labels
}

export const Cascader = forwardRef<HTMLButtonElement, CascaderProps>(
  (
    {
      options,
      value = [],
      onChange,
      placeholder = 'Seleccionar…',
      disabled,
      className,
      fullWidth = true,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)
    const [draftPath, setDraftPath] = useState<(string | number)[]>(value)

    const columns = useMemo(() => {
      const cols: CascaderOption[][] = [options]
      let current = options
      for (const segment of draftPath) {
        const node = current.find((o) => o.value === segment)
        if (node?.children?.length) {
          cols.push(node.children)
          current = node.children
        } else {
          break
        }
      }
      return cols
    }, [draftPath, options])

    const displayText = useMemo(() => {
      if (!value.length) return ''
      return findPathLabels(options, value).join(' / ')
    }, [options, value])

    const handleSelect = useCallback(
      (level: number, option: CascaderOption) => {
        const nextPath = [...draftPath.slice(0, level), option.value]
        setDraftPath(nextPath)
        if (!option.children?.length) {
          const labels = findPathLabels(options, nextPath)
          onChange?.(nextPath, labels)
          setOpen(false)
        }
      },
      [draftPath, onChange, options],
    )

    const handleOpenChange = (next: boolean) => {
      setOpen(next)
      if (next) setDraftPath(value)
    }

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            className={cn(
              'inline-flex h-10 items-center justify-between gap-[var(--spacing-sm)] rounded-[var(--radius)]',
              'border border-[var(--input-border)] bg-[var(--input)] px-[var(--spacing-md)] text-sm text-left',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              fullWidth && 'w-full',
              !displayText && 'text-[var(--foreground-muted)]',
              className,
            )}
          >
            <span className="truncate">{displayText || placeholder}</span>
            <ChevronRight className="w-4 h-4 shrink-0 rotate-90 text-[var(--foreground-muted)]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border-[var(--border)] bg-[var(--popover)] z-[var(--z-dropdown)]"
          align="start"
        >
          <div className="flex max-h-64 overflow-x-auto">
            {columns.map((col, level) => (
              <div
                key={level}
                className={cn(
                  'min-w-[9rem] overflow-y-auto border-[var(--border)]',
                  level > 0 && 'border-l',
                )}
              >
                {col.map((option) => {
                  const selected = draftPath[level] === option.value
                  const hasChildren = Boolean(option.children?.length)
                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => handleSelect(level, option)}
                      className={cn(
                        'flex w-full items-center justify-between gap-[var(--spacing-sm)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm text-left',
                        'hover:bg-[var(--secondary)] transition-colors duration-[var(--transition-fast)]',
                        selected && 'bg-[var(--accent)] text-[var(--accent-foreground)]',
                        option.disabled && 'opacity-50 pointer-events-none',
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {hasChildren && (
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[var(--foreground-muted)]" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          {value.length > 0 && (
            <div className="border-t border-[var(--border)] p-[var(--spacing-sm)]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  onChange?.([], [])
                  setDraftPath([])
                  setOpen(false)
                }}
              >
                Limpiar selección
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  },
)

Cascader.displayName = 'Cascader'

export default Cascader
