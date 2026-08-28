import { forwardRef } from 'react'

export interface SkeletonProps {
  variant?: 'rounded' | 'circular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'none'
  className?: string
}

const animationClasses: Record<NonNullable<SkeletonProps['animation']>, string> = {
  pulse: 'animate-pulse',
  none: '',
}

const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
  rounded: 'rounded-[var(--radius)]',
  circular: 'rounded-full',
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'rounded',
      animation = 'pulse',
      width,
      height,
      className = '',
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={`bg-[var(--muted)] ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
        style={{
          width: width ?? '100%',
          height: height ?? '1rem',
        }}
      />
    )
  },
)

Skeleton.displayName = 'Skeleton'

export default Skeleton
