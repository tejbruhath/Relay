'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { EventStatusBadge } from '@/components/dashboard/EventStatusBadge'
import { DeliveryAttemptRow } from '@/components/dashboard/DeliveryAttemptRow'
import { getEvent, getEventAttempts } from '@/lib/api'
import type { WebhookEvent, DeliveryAttempt } from '@/lib/types'
import { ApiError } from '@/lib/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>()
  const [event, setEvent]       = useState<WebhookEvent | null>(null)
  const [attempts, setAttempts] = useState<DeliveryAttempt[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [ev, att] = await Promise.all([
          getEvent(params.id),
          getEventAttempts(params.id),
        ])
        setEvent(ev)
        setAttempts(att)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={32} className="text-[var(--error)]" />
        <p className="text-[var(--text-secondary)]">{error ?? 'Event not found'}</p>
        <Link href="/dashboard/events" className="text-[var(--accent-signal)] hover:underline text-[13px]">
          ← Back to events
        </Link>
      </div>
    )
  }

  return (
    <div className="page-transition flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft size={14} />
        Back to events
      </Link>

      {/* Event header */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <EventStatusBadge status={event.status} />
              <span className="font-mono text-[13px] text-[var(--text-muted)]">
                {event.id}
              </span>
            </div>
            <h1 className="font-display font-bold text-[24px] text-[var(--text-primary)] mb-1">
              {event.event_type}
            </h1>
            <p className="text-[13px] text-[var(--text-muted)]">
              Created {formatDate(event.created_at)}
            </p>
            {event.delivered_at && (
              <p className="text-[13px] text-[var(--success)] mt-0.5">
                Delivered {formatDate(event.delivered_at)}
              </p>
            )}
          </div>
          <div className="text-right text-[13px]">
            <p className="text-[var(--text-muted)]">Attempt count</p>
            <p className="text-[28px] font-display font-bold text-[var(--text-primary)]">
              {event.attempt_count}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--bg-border)]">
          <p className="text-[12px] text-[var(--text-muted)] mb-1">Endpoint</p>
          <a
            href={event.endpoint}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-mono text-[var(--accent-blue)] hover:underline"
          >
            {event.endpoint}
          </a>
        </div>

        {event.idempotency_key && (
          <div className="mt-3">
            <p className="text-[12px] text-[var(--text-muted)] mb-1">Idempotency key</p>
            <span className="font-mono text-[12px] text-[var(--text-secondary)]">
              {event.idempotency_key}
            </span>
          </div>
        )}
      </Card>

      {/* Payload viewer */}
      <Card>
        <h2 className="font-display font-semibold text-[16px] text-[var(--text-primary)] mb-4">
          Payload
        </h2>
        <pre className="bg-[var(--bg-base)] border border-[var(--bg-border)] rounded-[8px] p-4 overflow-x-auto text-[12px] font-mono text-[var(--text-secondary)] leading-relaxed">
          <code>
            {JSON.stringify(event.payload, null, 2)}
          </code>
        </pre>
      </Card>

      {/* Delivery attempts */}
      <Card padding="p-0">
        <div className="px-6 py-4 border-b border-[var(--bg-border)]">
          <h2 className="font-display font-semibold text-[16px] text-[var(--text-primary)]">
            Delivery attempts
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            {attempts.length} attempt{attempts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {attempts.length === 0 ? (
          <div className="px-6 py-8 text-center text-[var(--text-muted)] text-[13px]">
            No delivery attempts yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--bg-border)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="text-left px-4 py-3 font-semibold">Attempt</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">HTTP code</th>
                  <th className="text-left px-4 py-3 font-semibold">Duration</th>
                  <th className="text-left px-4 py-3 font-semibold">Attempted at</th>
                  <th className="text-left px-4 py-3 font-semibold">Response / Error</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt, i) => (
                  <DeliveryAttemptRow key={attempt.id} attempt={attempt} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
