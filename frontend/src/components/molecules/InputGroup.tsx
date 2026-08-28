import { Slot } from '@radix-ui/react-slot'
import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Tamaño visual del grupo */
  size?: 'sm' | 'default' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 text-xs',
  default: 'h-10 text-sm',
  lg: 'h-12 text-base',
}

export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, size = 'default', ...props }, ref) => (
    <div
      ref={ref}
      data-size={size}
      className={cn(
        'inline-flex w-full items-stretch overflow-hidden rounded-[var(--radius)] border border-[var(--input-border)] bg-[var(--input)]',
        'focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--ring-offset)] focus-within:border-[var(--input-focus)]',
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
)
InputGroup.displayName = 'InputGroup'

export interface InputGroupAddonProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'inline-start' | 'inline-end'
}

export const InputGroupAddon = forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align = 'inline-start', ...props }, ref) => (
    <div
      ref={ref}
      data-align={align}
      className={cn(
        'flex shrink-0 items-center px-[var(--spacing-md)] text-[var(--foreground-muted)] bg-[var(--secondary)]',
        align === 'inline-start' && 'border-r border-[var(--border)]',
        align === 'inline-end' && 'border-l border-[var(--border)]',
        className,
      )}
      {...props}
    />
  ),
)
InputGroupAddon.displayName = 'InputGroupAddon'

export interface InputGroupInputProps extends React.ComponentPropsWithoutRef<'input'> {
  asChild?: boolean
}

export const InputGroupInput = forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'input'
    return (
      <Comp
        ref={ref}
        className={cn(
          'flex-1 min-w-0 bg-transparent px-[var(--spacing-md)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
InputGroupInput.displayName = 'InputGroupInput'

export default InputGroup
