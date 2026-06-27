'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, Link2, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { EventStatusBadge } from '@/components/dashboard/EventStatusBadge'
import { getUsage, listEvents } from '@/lib/api'
import type { UsageResponse, WebhookEvent } from '@/lib/types'
import { ApiError } from '@/lib/types'

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
}) {
  return (
    <Card className="flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: color ?? 'rgba(255,69,0,0.1)', border: `1px solid ${color ?? 'rgba(255,69,0,0.2)'}` }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[28px] font-display font-bold text-[var(--text-primary)] leading-none">
          {value}
        </p>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">{label}</p>
      </div>
    </Card>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DashboardOverviewPage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [u, e] = await Promise.all([
          getUsage(),
          listEvents({ page_size: 10 }),
        ])
        setUsage(u)
        setEvents(e.results)
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to load dashboard'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertTriangle size={32} className="text-[var(--error)]" />
        <p className="text-[var(--text-secondary)]">{error}</p>
      </div>
    )
  }

  const failedCount = events.filter(
    (e) => e.status === 'failed' || e.status === 'dead',
  ).length

  return (
    <div className="page-transition flex flex-col gap-8">
      <div>
        <h1 className="font-display font-bold text-[28px] text-[var(--text-primary)]">
          Overview
        </h1>
        <p className="text-[var(--text-secondary)] text-[14px] mt-1">
          Your webhook delivery at a glance
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Deliveries this month"
          value={(usage?.delivery_count ?? 0).toLocaleString()}
          icon={<Activity size={20} className="text-[var(--accent-signal)]" />}
          color="rgba(255,69,0,0.1)"
        />
        <StatCard
          label="Active endpoints"
          value="—"
          icon={<Link2 size={20} className="text-[var(--accent-blue)]" />}
          color="rgba(37,99,235,0.1)"
        />
        <StatCard
          label="Failed events (last 10)"
          value={failedCount}
          icon={<AlertTriangle size={20} className="text-[var(--warning)]" />}
          color="rgba(210,153,34,0.1)"
        />
      </div>

      {/* Usage bar */}
      {usage && (
        <Card>
          <h2 className="font-display font-semibold text-[16px] text-[var(--text-primary)] mb-4">
            Delivery quota
          </h2>
          <UsageBar
            count={usage.delivery_count}
            quota={usage.delivery_quota}
            plan={usage.plan}
          />
          {usage.delivery_quota && (
            <p className="text-[12px] text-[var(--text-muted)] mt-3">
              Period: {new Date(usage.period_start).toLocaleDateString()} —{' '}
              {new Date(usage.period_end).toLocaleDateString()}
            </p>
          )}
        </Card>
      )}

      {/* Recent events */}
      <Card padding="p-0">
        <div className="px-6 py-4 border-b border-[var(--bg-border)] flex items-center justify-between">
          <h2 className="font-display font-semibold text-[16px] text-[var(--text-primary)]">
            Recent events
          </h2>
          <Link
            href="/dashboard/events"
            className="text-[13px] text-[var(--accent-signal)] hover:underline"
          >
            View all →
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="px-6 py-12 text-center text-[var(--text-muted)]">
            No events yet. Dispatch your first event to see it here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--bg-border)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="text-left px-6 py-3 font-semibold">Event type</th>
                  <th className="text-left px-6 py-3 font-semibold">Endpoint</th>
                  <th className="text-left px-6 py-3 font-semibold">Status</th>
                  <th className="text-left px-6 py-3 font-semibold">Attempts</th>
                  <th className="text-left px-6 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-[var(--bg-border)] hover:bg-[rgba(255,69,0,0.03)] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-3 font-mono text-[var(--text-primary)]">
                      <Link href={`/dashboard/events/${event.id}`} className="hover:text-[var(--accent-signal)]">
                        {event.event_type}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-[var(--text-muted)] max-w-[180px]">
                      <span className="truncate block" title={event.endpoint}>
                        {event.endpoint.replace(/^https?:\/\//, '').slice(0, 32)}…
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <EventStatusBadge status={event.status} />
                    </td>
                    <td className="px-6 py-3 text-[var(--text-secondary)]">
                      {event.attempt_count}
                    </td>
                    <td className="px-6 py-3 text-[var(--text-muted)]">
                      {formatDate(event.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
