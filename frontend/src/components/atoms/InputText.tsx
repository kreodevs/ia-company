import { forwardRef, type ComponentPropsWithoutRef } from 'react'

export interface InputTextProps extends ComponentPropsWithoutRef<'input'> {
  error?: boolean
  fullWidth?: boolean
  label?: string
}

export const InputText = forwardRef<HTMLInputElement, InputTextProps>(
  ({ error, fullWidth, label, className = '', id, ...props }, ref) => {
    const baseStyles = `
      flex h-10 rounded-[var(--radius)]
      border border-[var(--input-border)]
      bg-[var(--input)] px-[var(--spacing-md)] py-[var(--spacing-sm)]
      text-sm text-[var(--foreground)]
      placeholder:text-[var(--foreground-muted)]
      transition-all duration-[var(--transition-base)]
      focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--ring-offset)] focus:border-[var(--input-focus)]
      disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--muted)]
      file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--foreground)]
    `

    const errorStyles = error
      ? 'border-[var(--destructive)] focus:ring-[var(--destructive)]'
      : ''

    const widthStyles = fullWidth ? 'w-full' : ''

    const resolvedId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    const input = (
      <input
        ref={ref}
        id={resolvedId}
        className={`${baseStyles} ${errorStyles} ${widthStyles} ${className}`.trim()}
        {...props}
      />
    )

    if (!label) return input

    return (
      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label
          htmlFor={resolvedId}
          className="text-sm font-medium text-[var(--foreground)]"
        >
          {label}
        </label>
        {input}
      </div>
    )
  }
)

InputText.displayName = 'InputText'

export default InputText
