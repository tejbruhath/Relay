'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'secondary'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-[var(--accent-signal)] text-white hover:brightness-110 active:scale-[0.98] shadow-[0_0_20px_rgba(255,69,0,0.25)]',
  ghost:
    'border border-[var(--bg-border)] text-[var(--text-primary)] hover:border-[rgba(255,69,0,0.4)] hover:bg-[var(--bg-surface)]',
  danger:
    'bg-[var(--error)] text-white hover:brightness-110 active:scale-[0.98]',
  secondary:
    'bg-[var(--bg-surface)] border border-[var(--bg-border)] text-[var(--text-primary)] hover:border-[rgba(255,69,0,0.3)]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-4 text-[13px]',
  md: 'h-[48px] px-6 text-[14px]',
  lg: 'h-14 px-8 text-[16px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-[8px] font-medium transition-all duration-150 font-body',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? 'w-full' : '',
          (disabled || loading) ? 'opacity-50 cursor-not-allowed' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading && (
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin-slow"
            aria-hidden
          />
        )}
        {children}
      </button>
    )
  },
)
