import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

export interface PasswordInputProps extends ComponentPropsWithoutRef<'input'> {
  error?: boolean
}

export const Password = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ error, className = '', ...props }, ref) => {
    const [visible, setVisible] = useState(false)

    const inputStyles = [
      'flex h-10 w-full rounded-[var(--radius)]',
      'border border-[var(--input-border)]',
      'bg-[var(--input)] px-[var(--spacing-md)] py-[var(--spacing-sm)] pr-[var(--spacing-2xl)]',
      'text-sm text-[var(--foreground)]',
      'placeholder:text-[var(--foreground-muted)]',
      'transition-all duration-[var(--transition-base)]',
      'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--ring-offset)] focus:border-[var(--input-focus)]',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--muted)]',
      error ? 'border-[var(--destructive)] focus:ring-[var(--destructive)]' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    const ToggleIcon = visible ? EyeOff : Eye

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={inputStyles}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          tabIndex={-1}
          className="absolute right-[var(--spacing-md)] top-[var(--spacing-xs)]/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center p-0 border-none bg-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <ToggleIcon className="w-4 h-4" />
        </button>
      </div>
    )
  },
)

Password.displayName = 'Password'

export default Password
