import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: string
}

export function Card({ children, className = '', hover = false, padding = 'p-6' }: CardProps) {
  return (
    <div
      className={[
        'rounded-[12px] border border-[var(--bg-border)] bg-[var(--bg-surface)]',
        hover ? 'card-hover cursor-pointer' : '',
        padding,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
