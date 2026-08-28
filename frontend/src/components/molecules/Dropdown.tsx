import * as SelectPrimitive from '@radix-ui/react-select'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/atoms/Select'

export interface DropdownInputProps
  extends ComponentPropsWithoutRef<typeof SelectPrimitive.Root> {
  options: { label: string; value: any }[]
  value: any
  onChange: (e: { value: any }) => void
  placeholder?: string
  className?: string
  error?: boolean
}

export const Dropdown = forwardRef<HTMLButtonElement, DropdownInputProps>(
  (
    { options, value, onChange, placeholder = 'Seleccionar...', error, className, ...props },
    ref,
  ) => {
    return (
      <Select
        value={value}
        onValueChange={(newValue) => onChange?.({ value: newValue })}
        {...props}
      >
        <SelectTrigger
          ref={ref}
          className={cn(
            error && 'border-[var(--destructive)] focus:ring-[var(--destructive)]',
            className,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  },
)
Dropdown.displayName = 'Dropdown'

export default Dropdown
