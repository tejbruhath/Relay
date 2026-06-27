'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
  leftIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, helpText, leftIcon, className = '', id, ...rest }, ref) {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-[13px] font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={[
              'w-full h-[48px] rounded-[8px] border px-4 text-[14px] font-body',
              'bg-[var(--bg-surface)] text-[var(--text-primary)]',
              'border-[var(--bg-border)] placeholder-[var(--text-muted)]',
              'focus:outline-none focus:border-[var(--accent-signal)] focus:ring-1 focus:ring-[var(--accent-signal)]',
              'transition-colors duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon ? 'pl-10' : '',
              error ? 'border-[var(--error)]' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
        </div>
        {error && (
          <p className="text-[12px] text-[var(--error)]">{error}</p>
        )}
        {helpText && !error && (
          <p className="text-[12px] text-[var(--text-muted)]">{helpText}</p>
        )}
      </div>
    )
  },
)
