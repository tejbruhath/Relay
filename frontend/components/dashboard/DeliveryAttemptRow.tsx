import type { DeliveryAttempt } from '@/lib/types'

interface DeliveryAttemptRowProps {
  attempt: DeliveryAttempt
  index: number
}

const STATUS_COLORS = {
  success: 'text-[var(--success)]',
  failure: 'text-[var(--error)]',
  timeout: 'text-[var(--warning)]',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function DeliveryAttemptRow({ attempt, index }: DeliveryAttemptRowProps) {
  return (
    <tr
      className={[
        'border-b border-[var(--bg-border)] text-[13px] transition-colors',
        index % 2 === 0 ? 'bg-transparent' : 'bg-[rgba(28,35,51,0.4)]',
        'hover:bg-[rgba(255,69,0,0.04)]',
      ].join(' ')}
    >
      <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
        #{attempt.attempt_number}
      </td>
      <td className="px-4 py-3">
        <span className={`font-semibold ${STATUS_COLORS[attempt.status]}`}>
          {attempt.status.charAt(0).toUpperCase() + attempt.status.slice(1)}
        </span>
      </td>
      <td className="px-4 py-3">
        {attempt.http_status_code !== null ? (
          <span
            className={[
              'font-mono font-bold',
              attempt.http_status_code >= 200 && attempt.http_status_code < 300
                ? 'text-[var(--success)]'
                : 'text-[var(--error)]',
            ].join(' ')}
          >
            {attempt.http_status_code}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--text-secondary)]">
        {attempt.duration_ms !== null ? (
          `${attempt.duration_ms}ms`
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--text-muted)]">
        {formatDate(attempt.attempted_at)}
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        {attempt.error_message ? (
          <span
            className="text-[var(--error)] truncate block"
            title={attempt.error_message}
          >
            {attempt.error_message}
          </span>
        ) : attempt.response_body ? (
          <span
            className="font-mono text-[11px] text-[var(--text-muted)] truncate block"
            title={attempt.response_body}
          >
            {attempt.response_body.slice(0, 60)}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </td>
    </tr>
  )
}
