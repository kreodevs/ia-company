import { forwardRef, type ReactNode, type HTMLAttributes } from 'react'

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  subtitle?: ReactNode
  footer?: ReactNode
  className?: string
  children?: ReactNode
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ title, subtitle, footer, className = '', children, ...props }, ref) => {
    const hasHeader = title || subtitle

    return (
      <div
        ref={ref}
        className={`bg-[var(--card)] border border-[var(--card-border)] rounded-[var(--radius-md)] shadow-sm overflow-hidden ${className}`.trim()}
        {...props}
      >
        {hasHeader && (
          <div className="px-[var(--spacing-md)] py-[var(--spacing-md)] border-b border-[var(--border)]">
            {title && (
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-[var(--foreground-muted)] mt-[var(--spacing-xxs)]">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children && (
          <div className="px-[var(--spacing-md)] py-[var(--spacing-md)]">
            {children}
          </div>
        )}
        {footer && (
          <div className="px-[var(--spacing-md)] py-[var(--spacing-md)] border-t border-[var(--border)]">
            {footer}
          </div>
        )}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Subcomponents for flexible composition
export const CardHeader = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`px-[var(--spacing-md)] py-[var(--spacing-md)] border-b border-[var(--border)] ${className}`}>
    {children}
  </div>
)

export const CardContent = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`px-[var(--spacing-md)] py-[var(--spacing-md)] ${className}`}>
    {children}
  </div>
)

export const CardFooter = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`px-[var(--spacing-md)] py-[var(--spacing-md)] border-t border-[var(--border)] ${className}`}>
    {children}
  </div>
)

export const CardTitle = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-[var(--foreground)] ${className}`}>
    {children}
  </h3>
)

export const CardDescription = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <p className={`text-sm text-[var(--foreground-muted)] ${className}`}>
    {children}
  </p>
)

export default Card
