import { format, setHours, setMinutes, setSeconds } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import {
  forwardRef,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from 'react'
import type { Matcher } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { CalendarPrimitive } from '@/components/atoms/CalendarPrimitive'
import { Button } from '@/components/atoms/Button'
import { InputText } from '@/components/atoms/InputText'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/molecules/Popover'

export type Nullable<T> = T | null | undefined

type CalendarChangeEvent<T> = { value: T }

const DATE_FORMAT_MAP: Record<string, string> = {
  'dd/mm/yy': 'dd/MM/yyyy',
  'mm/yy': 'MM/yyyy',
  yy: 'yyyy',
}

function mapDateFormat(dateFormat?: string): string {
  if (!dateFormat) return 'dd/MM/yyyy'
  return DATE_FORMAT_MAP[dateFormat] ?? dateFormat
}

function buildDisabledMatchers(options: {
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  disabledDays?: number[]
}): Matcher[] {
  const matchers: Matcher[] = []
  if (options.minDate) matchers.push({ before: options.minDate })
  if (options.maxDate) matchers.push({ after: options.maxDate })
  if (options.disabledDays?.length) {
    matchers.push({ dayOfWeek: options.disabledDays as [number, ...number[]] })
  }
  if (options.disabledDates?.length) {
    matchers.push(...options.disabledDates)
  }
  return matchers
}

function formatDisplayValue(
  value: unknown,
  selectionMode: 'single' | 'multiple' | 'range',
  dateFormat: string,
): string {
  const fmt = mapDateFormat(dateFormat)
  if (selectionMode === 'single' && value instanceof Date) {
    return format(value, fmt, { locale: es })
  }
  if (selectionMode === 'multiple' && Array.isArray(value)) {
    return value
      .filter((d): d is Date => d instanceof Date)
      .map((d) => format(d, fmt, { locale: es }))
      .join(', ')
  }
  if (selectionMode === 'range' && Array.isArray(value)) {
    const [from, to] = value as (Date | null | undefined)[]
    if (from && to) {
      return `${format(from, fmt, { locale: es })} - ${format(to, fmt, { locale: es })}`
    }
    if (from) return format(from, fmt, { locale: es })
  }
  return ''
}

function MonthYearGrid({
  mode,
  value,
  onSelect,
  minDate,
  maxDate,
}: {
  mode: 'month' | 'year'
  value?: Date | null
  onSelect: (date: Date) => void
  minDate?: Date
  maxDate?: Date
}) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(value?.getFullYear() ?? now.getFullYear())

  if (mode === 'month') {
    const months = Array.from({ length: 12 }, (_, i) => i)
    return (
      <div className="p-[var(--spacing-sm)] space-y-[var(--spacing-sm)]">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon" onClick={() => setViewYear((y) => y - 1)}>
            ‹
          </Button>
          <span className="text-sm font-medium">{viewYear}</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => setViewYear((y) => y + 1)}>
            ›
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-[var(--spacing-sm)]">
          {months.map((month) => {
            const date = new Date(viewYear, month, 1)
            const disabled =
              (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) ||
              (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1))
            const selected = value && value.getFullYear() === viewYear && value.getMonth() === month
            return (
              <Button
                key={month}
                type="button"
                variant={selected ? 'default' : 'ghost'}
                size="sm"
                disabled={Boolean(disabled)}
                onClick={() => onSelect(date)}
                className="text-xs"
              >
                {format(date, 'MMM', { locale: es })}
              </Button>
            )
          })}
        </div>
      </div>
    )
  }

  const startYear = Math.floor(viewYear / 12) * 12
  const years = Array.from({ length: 12 }, (_, i) => startYear + i)

  return (
    <div className="p-[var(--spacing-sm)] space-y-[var(--spacing-sm)]">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon" onClick={() => setViewYear((y) => y - 12)}>
          ‹
        </Button>
        <span className="text-sm font-medium">
          {startYear} – {startYear + 11}
        </span>
        <Button type="button" variant="ghost" size="icon" onClick={() => setViewYear((y) => y + 12)}>
          ›
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-[var(--spacing-sm)]">
        {years.map((year) => {
          const date = new Date(year, 0, 1)
          const disabled = (minDate && year < minDate.getFullYear()) || (maxDate && year > maxDate.getFullYear())
          const selected = value?.getFullYear() === year
          return (
            <Button
              key={year}
              type="button"
              variant={selected ? 'default' : 'ghost'}
              size="sm"
              disabled={Boolean(disabled)}
              onClick={() => onSelect(date)}
              className="text-xs"
            >
              {year}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export interface CalendarInputProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange' | 'value'> {
  value?: Nullable<Date | Date[] | (Date | null)[]>
  onChange?: (e: CalendarChangeEvent<Nullable<Date | Date[] | (Date | null)[]>>) => void
  error?: boolean
  fullWidth?: boolean
  variant?: 'default' | 'inline'
  rounded?: boolean
  selectionMode?: 'single' | 'multiple' | 'range'
  placeholder?: string
  dateFormat?: string
  disabled?: boolean
  readOnlyInput?: boolean
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  disabledDays?: number[]
  showTime?: boolean
  hourFormat?: '12' | '24'
  view?: 'date' | 'month' | 'year'
  numberOfMonths?: number
  showButtonBar?: boolean
}

export const Calendar = forwardRef<HTMLDivElement, CalendarInputProps>(
  (
    {
      value,
      onChange,
      error,
      fullWidth,
      variant = 'default',
      rounded = false,
      className = '',
      selectionMode = 'single',
      placeholder = 'Seleccionar fecha',
      dateFormat = 'dd/mm/yy',
      disabled,
      readOnlyInput,
      minDate,
      maxDate,
      disabledDates,
      disabledDays,
      showTime = false,
      hourFormat = '24',
      view = 'date',
      numberOfMonths = 1,
      showButtonBar = true,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)
    const disabledMatchers = useMemo(
      () => buildDisabledMatchers({ minDate, maxDate, disabledDates, disabledDays }),
      [minDate, maxDate, disabledDates, disabledDays],
    )

    const displayText = formatDisplayValue(value, selectionMode, dateFormat)

    const emitChange = (next: Nullable<Date | Date[] | (Date | null)[]>) => {
      onChange?.({ value: next })
    }

    const handleSingleSelect = (date: Date | undefined) => {
      if (!date) {
        emitChange(null)
        return
      }
      let next = date
      if (showTime && value instanceof Date) {
        next = setHours(setMinutes(setSeconds(date, value.getSeconds()), value.getMinutes()), value.getHours())
      }
      emitChange(next)
      if (!showTime && variant === 'default') setOpen(false)
    }

    const handleMultipleSelect = (dates: Date[] | undefined) => {
      emitChange(dates ?? null)
    }

    const handleRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
      if (!range) {
        emitChange(null)
        return
      }
      emitChange([range.from ?? null, range.to ?? null])
    }

    const handleTimeChange = (type: 'hours' | 'minutes', raw: string) => {
      if (!(value instanceof Date)) return
      const num = parseInt(raw, 10)
      if (Number.isNaN(num)) return
      const next =
        type === 'hours'
          ? setHours(value, Math.min(hourFormat === '12' ? 12 : 23, Math.max(0, num)))
          : setMinutes(value, Math.min(59, Math.max(0, num)))
      emitChange(next)
    }

    const timeSection =
      showTime && value instanceof Date ? (
        <div className="flex items-center justify-center gap-[var(--spacing-sm)] pt-[var(--spacing-md)] mt-[var(--spacing-md)] border-t border-[var(--border)]">
          <InputText
            type="number"
            min={0}
            max={hourFormat === '24' ? 23 : 12}
            value={String(value.getHours()).padStart(2, '0')}
            onChange={(e) => handleTimeChange('hours', e.target.value)}
            className="w-16 h-8 text-center"
            aria-label="Horas"
          />
          <span className="text-[var(--foreground-muted)]">:</span>
          <InputText
            type="number"
            min={0}
            max={59}
            value={String(value.getMinutes()).padStart(2, '0')}
            onChange={(e) => handleTimeChange('minutes', e.target.value)}
            className="w-16 h-8 text-center"
            aria-label="Minutos"
          />
        </div>
      ) : null

    const buttonBar = showButtonBar ? (
      <div className="flex items-center justify-end gap-[var(--spacing-sm)] pt-[var(--spacing-md)] mt-[var(--spacing-md)] border-t border-[var(--border)]">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date()
            if (selectionMode === 'single') emitChange(today)
            else if (selectionMode === 'range') emitChange([today, today])
            else emitChange([today])
          }}
        >
          Hoy
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => emitChange(null)}>
          Limpiar
        </Button>
      </div>
    ) : null

    const calendarPanel = (
      <div
        className={cn(
          'rounded-[var(--radius)] border border-[var(--border)] bg-[var(--popover)] shadow-lg',
          variant === 'inline' && 'shadow-none',
        )}
      >
        {view === 'month' || view === 'year' ? (
          <MonthYearGrid
            mode={view}
            value={value instanceof Date ? value : null}
            onSelect={(date) => {
              emitChange(date)
              if (variant === 'default') setOpen(false)
            }}
            minDate={minDate}
            maxDate={maxDate}
          />
        ) : selectionMode === 'single' ? (
          <CalendarPrimitive
            mode="single"
            selected={value instanceof Date ? value : undefined}
            onSelect={handleSingleSelect}
            disabled={disabledMatchers.length ? disabledMatchers : undefined}
            numberOfMonths={numberOfMonths}
            defaultMonth={value instanceof Date ? value : undefined}
          />
        ) : selectionMode === 'multiple' ? (
          <CalendarPrimitive
            mode="multiple"
            selected={Array.isArray(value) ? (value.filter((d) => d instanceof Date) as Date[]) : undefined}
            onSelect={handleMultipleSelect}
            disabled={disabledMatchers.length ? disabledMatchers : undefined}
            numberOfMonths={numberOfMonths}
          />
        ) : (
          <CalendarPrimitive
            mode="range"
            selected={
              Array.isArray(value)
                ? { from: (value[0] as Date | null) ?? undefined, to: (value[1] as Date | null) ?? undefined }
                : undefined
            }
            onSelect={handleRangeSelect}
            disabled={disabledMatchers.length ? disabledMatchers : undefined}
            numberOfMonths={numberOfMonths}
          />
        )}
        {timeSection}
        {buttonBar}
      </div>
    )

    const roundedClass = rounded ? 'rounded-full' : 'rounded-[var(--radius)]'
    const inputStyles = cn(
      'flex h-10 w-full pr-[var(--spacing-lg)] text-sm text-[var(--foreground)]',
      'border border-[var(--input-border)] bg-[var(--input)] px-[var(--spacing-md)] py-[var(--spacing-sm)]',
      'placeholder:text-[var(--foreground-muted)] transition-all duration-[var(--transition-base)]',
      'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--ring-offset)] focus:border-[var(--input-focus)]',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--muted)]',
      error && 'border-[var(--destructive)] focus:ring-[var(--destructive)]',
      roundedClass,
      fullWidth && 'w-full',
    )

    if (variant === 'inline') {
      return (
        <div ref={ref} className={cn(fullWidth && 'w-full', className)} {...props}>
          {calendarPanel}
        </div>
      )
    }

    return (
      <div ref={ref} className={cn('relative', fullWidth && 'w-full', className)} {...props}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild disabled={disabled}>
            <button
              type="button"
              disabled={disabled}
              className={cn(inputStyles, 'text-left cursor-pointer')}
            >
              <span className={cn(!displayText && 'text-[var(--foreground-muted)]')}>
                {displayText || placeholder}
              </span>
              <CalendarIcon className="absolute right-[var(--spacing-md)] top-[var(--spacing-xs)]/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-[var(--border)] bg-[var(--popover)] z-[var(--z-dropdown)]" align="start">
            {calendarPanel}
          </PopoverContent>
        </Popover>
      </div>
    )
  },
)

Calendar.displayName = 'Calendar'

export interface DateRangePickerProps extends Omit<CalendarInputProps, 'selectionMode' | 'value' | 'onChange'> {
  value?: Nullable<(Date | null)[]>
  onChange?: (value: Nullable<(Date | null)[]>) => void
  numberOfMonths?: number
}

export const DateRangePicker = forwardRef<HTMLDivElement, DateRangePickerProps>(
  ({ value, onChange, numberOfMonths = 2, placeholder = 'Seleccionar rango de fechas', ...props }, ref) => {
    return (
      <Calendar
        ref={ref}
        value={value as CalendarInputProps['value']}
        onChange={(e) => onChange?.(e.value as Nullable<(Date | null)[]>)}
        selectionMode="range"
        numberOfMonths={numberOfMonths}
        placeholder={placeholder}
        readOnlyInput
        {...props}
      />
    )
  },
)

DateRangePicker.displayName = 'DateRangePicker'

export default Calendar
