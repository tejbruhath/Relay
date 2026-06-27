interface SpinnerProps {
  size?: number
  className?: string
}

export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <span
      aria-label="Loading"
      role="status"
      style={{ width: size, height: size }}
      className={[
        'inline-block border-2 border-[var(--bg-border)] border-t-[var(--accent-signal)] rounded-full animate-spin-slow',
        className,
      ].join(' ')}
    />
  )
}
