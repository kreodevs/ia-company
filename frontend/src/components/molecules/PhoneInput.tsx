import { Check, ChevronsUpDown } from 'lucide-react'
import { forwardRef, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { PHONE_COUNTRIES, findCountryByCode, type PhoneCountry } from '@/lib/phoneCountries'
import { Button } from '@/components/atoms/Button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/molecules/Command'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/molecules/InputGroup'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/molecules/Popover'

export interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  defaultCountry?: string
  countries?: PhoneCountry[]
  label?: string
  placeholder?: string
  error?: boolean
  disabled?: boolean
  className?: string
  fullWidth?: boolean
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value = '',
      onChange,
      defaultCountry = 'MX',
      countries = PHONE_COUNTRIES,
      label,
      placeholder = 'Número de teléfono',
      error,
      disabled,
      className,
      fullWidth = true,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)
    const [countryCode, setCountryCode] = useState(defaultCountry)

    const country = useMemo(
      () => findCountryByCode(countryCode) ?? countries[0],
      [countryCode, countries],
    )

    const localNumber = useMemo(() => {
      if (!value) return ''
      if (value.startsWith(country.dial)) {
        return value.slice(country.dial.length).trim()
      }
      return value.replace(/^\+\d+\s*/, '')
    }, [country.dial, value])

    const handleCountrySelect = (code: string) => {
      const next = findCountryByCode(code) ?? country
      setCountryCode(next.code)
      setOpen(false)
      const digits = localNumber.replace(/\D/g, '')
      onChange?.(digits ? `${next.dial} ${digits}` : next.dial)
    }

    const handleNumberChange = (raw: string) => {
      const digits = raw.replace(/[^\d\s-]/g, '')
      onChange?.(digits.trim() ? `${country.dial} ${digits.trim()}` : '')
    }

    const field = (
      <InputGroup
        className={cn(
          error && 'border-[var(--destructive)] focus-within:ring-[var(--destructive)]',
          fullWidth && 'w-full',
          className,
        )}
      >
        <InputGroupAddon align="inline-start" className="p-0">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                className="h-full gap-[var(--spacing-xs)] rounded-none px-[var(--spacing-sm)] hover:bg-[var(--secondary)]"
                aria-label="Seleccionar país"
              >
                <span aria-hidden>{country.flag}</span>
                <span className="text-xs font-medium">{country.dial}</span>
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 z-[var(--z-dropdown)]" align="start">
              <Command>
                <CommandInput placeholder="Buscar país…" />
                <CommandList>
                  <CommandEmpty>Sin resultados</CommandEmpty>
                  <CommandGroup>
                    {countries.map((c) => (
                      <CommandItem
                        key={c.code}
                        value={`${c.label} ${c.dial}`}
                        onSelect={() => handleCountrySelect(c.code)}
                      >
                        <span className="mr-[var(--spacing-sm)]">{c.flag}</span>
                        <span className="flex-1 truncate">{c.label}</span>
                        <span className="text-xs text-[var(--foreground-muted)]">{c.dial}</span>
                        {c.code === country.code && (
                          <Check className="ml-[var(--spacing-sm)] w-4 h-4 text-[var(--primary)]" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
        <InputGroupInput
          ref={ref}
          type="tel"
          inputMode="tel"
          value={localNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </InputGroup>
    )

    if (!label) return field

    return (
      <div className={cn('flex flex-col gap-[var(--spacing-xs)]', fullWidth && 'w-full')}>
        <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>
        {field}
      </div>
    )
  },
)

PhoneInput.displayName = 'PhoneInput'

export default PhoneInput
