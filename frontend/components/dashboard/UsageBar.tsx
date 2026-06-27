import type { Plan } from '@/lib/types'

interface UsageBarProps {
  count: number
  quota: number | null
  plan: Plan
}

function getBarColor(pct: number): string {
  if (pct >= 0.85) return 'var(--error)'
  if (pct >= 0.6)  return 'var(--warning)'
  return 'var(--accent-blue)'
}

export function UsageBar({ count, quota, plan }: UsageBarProps) {
  if (quota === null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[var(--text-secondary)]">Deliveries this period</span>
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
            {count.toLocaleString()} / Unlimited
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--bg-border)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: '30%', background: 'var(--accent-signal)' }}
          />
        </div>
        <p className="text-[12px] text-[var(--text-muted)]">
          Scale plan — unlimited deliveries
        </p>
      </div>
    )
  }

  const pct = Math.min(count / quota, 1)
  const color = getBarColor(pct)
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[var(--text-secondary)]">
          Deliveries this period
        </span>
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          {count.toLocaleString()} / {quota.toLocaleString()}
        </span>
      </div>

      {/* Progress track */}
      <div
        className="h-2 rounded-full bg-[var(--bg-border)] overflow-hidden"
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={quota}
        aria-label={`${count} of ${quota} deliveries used`}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[var(--text-muted)]">
          {planLabel} plan · {Math.round(pct * 100)}% used
        </p>
        {pct >= 0.85 && (
          <p className="text-[12px] font-medium" style={{ color: 'var(--error)' }}>
            Near limit — consider upgrading
          </p>
        )}
      </div>
    </div>
  )
}
