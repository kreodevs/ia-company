import { forwardRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
    label?: string;
    error?: string;
    value?: number | null;
    onChange?: (value: number | null) => void;
    currency?: string; // e.g. 'USD', 'MXN', 'EUR'
    locale?: string; // e.g. 'en-US', 'es-MX'
    decimals?: number; // Cuántos decimales permites (si se pasa, no rellena con ceros innecesarios)
}

/**
 * Formatea un número como string de moneda usando Intl.NumberFormat.
 */
function formatCurrency(
    value: number | null | undefined,
    locale: string,
    currency: string,
    decimals?: number,
): string {
    if (value == null) return ''
    try {
        const minDec = decimals ?? 2
        const maxDec = decimals ?? 2
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: minDec,
            maximumFractionDigits: maxDec,
        }).format(value)
    } catch {
        return String(value)
    }
}

/**
 * Parsea un string ingresado por el usuario de vuelta a número,
 * respetando los separadores decimales/de grupo del locale.
 */
function parseNumberInput(input: string, locale: string): number | null {
    if (!input.trim()) return null

    try {
        // Obtener separadores del locale
        const sample = new Intl.NumberFormat(locale).formatToParts(1234.56)
        const decimalSep = sample.find(p => p.type === 'decimal')?.value ?? '.'
        const groupSep = sample.find(p => p.type === 'group')?.value ?? ','

        // Limpiar: quitar todo excepto dígitos, separador decimal, signo menos, E(e)
        const cleaned = input.replace(
            new RegExp(`[^0-9\\${decimalSep}eE\\-]`, 'g'), '',
        )

        // Normalizar separador decimal a '.' y eliminar separadores de grupo
        let normalized
        if (decimalSep !== '.') {
            // Reemplazar separador decimal local por punto, y eliminar grupos
            normalized = cleaned
                .replace(new RegExp(`\\${groupSep}`, 'g'), '')
                .replace(new RegExp(`\\${decimalSep}`), '.')
        } else {
            normalized = cleaned.replace(new RegExp(`\\${groupSep}`, 'g'), '')
        }

        // Asegurar un solo punto decimal
        const parts = normalized.split('.')
        const final = parts.length > 1
            ? parts[0] + '.' + parts.slice(1).join('')
            : normalized

        const num = parseFloat(final)
        return isNaN(num) ? null : num
    } catch {
        const num = parseFloat(input.replace(/[^0-9.\-]/g, ''))
        return isNaN(num) ? null : num
    }
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
    (
        {
            className,
            label,
            error,
            placeholder,
            value,
            onChange,
            disabled,
            currency = 'USD',
            locale = 'en-US',
            decimals,
            ...inputProps
        },
        ref,
    ) => {
        // Validar locale
        let safeLocale = 'en-US'
        try {
            Intl.NumberFormat(locale)
            safeLocale = locale
        } catch {
            safeLocale = 'en-US'
        }

        const safeCurrency = currency.length === 3 ? currency : 'USD'

        // displayText: lo que se ve en el <input>
        const [displayText, setDisplayText] = useState(() =>
            formatCurrency(value, safeLocale, safeCurrency, decimals),
        )
        const [focused, setFocused] = useState(false)

        // Sincronizar value externo → display cuando no estamos en edición
        useEffect(() => {
            if (!focused) {
                setDisplayText(formatCurrency(value, safeLocale, safeCurrency, decimals))
            }
        }, [value, focused, safeLocale, safeCurrency, decimals])

        const handleFocus = useCallback(() => {
            if (disabled) return
            setFocused(true)
            // Al enfocar, mostrar el valor númerico puro para edición
            setDisplayText(value != null ? String(value) : '')
        }, [disabled, value])

        const handleBlur = useCallback(() => {
            setFocused(false)
            const parsed = parseNumberInput(displayText, safeLocale)
            // Llamar onChange con el valor numérico crudo
            if (parsed !== value) {
                onChange?.(parsed)
            }
            // Reformatear para display
            setDisplayText(formatCurrency(parsed, safeLocale, safeCurrency, decimals))
        }, [displayText, onChange, safeLocale, safeCurrency, decimals, value])

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            setDisplayText(e.target.value)
        }, [])

        const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                ;(e.target as HTMLInputElement).blur()
            }
        }, [])

        return (
            <div className="flex flex-col gap-[var(--spacing-xs)] w-full">
                {label && (
                    <label className="text-sm font-medium leading-none text-[var(--foreground)]">
                        {label}
                    </label>
                )}

                <input
                    ref={ref}
                    type="text"
                    inputMode="decimal"
                    value={displayText}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder ?? '0.00'}
                    disabled={disabled}
                    className={cn(
                        'flex h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm ring-offset-[var(--background)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--foreground-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
                        error &&
                            'border-[var(--destructive)] focus-visible:ring-[var(--destructive)]',
                        className,
                    )}
                    {...inputProps}
                />

                {error && (
                    <span className="text-[14px] text-[var(--destructive)]">{error}</span>
                )}
            </div>
        )
    },
)
CurrencyInput.displayName = 'CurrencyInput'
