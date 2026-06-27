import type { EventStatus } from '@/lib/types'

interface EventStatusBadgeProps {
  status: EventStatus
}

const CONFIG: Record<EventStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/30',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-900/50 text-green-300 border-green-700/30',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-900/50 text-red-300 border-red-700/30',
  },
  dead: {
    label: 'Dead',
    className: 'bg-gray-800/80 text-gray-400 border-gray-700/30',
  },
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const cfg = CONFIG[status]
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
        cfg.className,
      ].join(' ')}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background:
            status === 'delivered'
              ? 'var(--success)'
              : status === 'pending'
              ? 'var(--warning)'
              : status === 'failed'
              ? 'var(--error)'
              : 'var(--text-muted)',
        }}
        aria-hidden
      />
      {cfg.label}
    </span>
  )
}
