'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, AlertTriangle, Activity } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { EventStatusBadge } from '@/components/dashboard/EventStatusBadge'
import { listEvents, listEndpoints } from '@/lib/api'
import type { WebhookEvent, WebhookEndpoint, EventStatus } from '@/lib/types'
import { ApiError } from '@/lib/types'

const PAGE_SIZE = 25
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',          label: 'All statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed',    label: 'Failed' },
  { value: 'dead',      label: 'Dead' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function EventsPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [endpointFilter, setEndpointFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listEvents({
        status:    statusFilter || undefined,
        endpoint:  endpointFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      })
      setEvents(res.results)
      setTotal(res.count)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, endpointFilter, page])

  useEffect(() => { load() }, [load])

  // Load endpoints for filter dropdown
  useEffect(() => {
    listEndpoints().then(setEndpoints).catch(() => {/* ignore */})
  }, [])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function applyFilter() {
    setPage(1)
    load()
  }

  return (
    <div className="page-transition flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-[28px] text-[var(--text-primary)]">
          Events
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">
          All webhook events dispatched through Relay
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Status
          </label>
          <select
            id="events-status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-surface)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-signal)]"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Endpoint
          </label>
          <select
            id="events-endpoint-filter"
            value={endpointFilter}
            onChange={(e) => { setEndpointFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-surface)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-signal)] max-w-[220px]"
          >
            <option value="">All endpoints</option>
            {endpoints.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.url.replace(/^https?:\/\//, '').slice(0, 36)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={applyFilter}
          className="h-10 px-4 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-surface)] text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[rgba(255,69,0,0.3)] transition-all"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      <div className="rounded-[12px] border border-[var(--bg-border)] bg-[var(--bg-surface)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner size={28} />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 gap-3">
            <AlertTriangle size={20} className="text-[var(--error)]" />
            <p className="text-[var(--text-secondary)]">{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Activity size={28} className="text-[var(--text-muted)]" />
            <p className="text-[var(--text-secondary)]">No events found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--bg-border)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="text-left px-5 py-3 font-semibold">Event type</th>
                  <th className="text-left px-5 py-3 font-semibold">Endpoint</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-left px-5 py-3 font-semibold">Attempts</th>
                  <th className="text-left px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, i) => (
                  <tr
                    key={event.id}
                    className={[
                      'border-b border-[var(--bg-border)] hover:bg-[rgba(255,69,0,0.03)] transition-colors cursor-pointer',
                      i % 2 !== 0 ? 'bg-[rgba(28,35,51,0.3)]' : '',
                    ].join(' ')}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="font-mono text-[var(--text-primary)] hover:text-[var(--accent-signal)]"
                      >
                        {event.event_type}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[var(--text-muted)] max-w-[180px]">
                      <span className="truncate block" title={event.endpoint}>
                        {event.endpoint.replace(/^https?:\/\//, '').slice(0, 36)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <EventStatusBadge status={event.status as EventStatus} />
                    </td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">
                      {event.attempt_count}
                    </td>
                    <td className="px-5 py-3 text-[var(--text-muted)]">
                      {formatDate(event.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--bg-border)]">
            <p className="text-[12px] text-[var(--text-muted)]">
              {total} events · page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 h-8 rounded-[6px] border border-[var(--bg-border)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 h-8 rounded-[6px] border border-[var(--bg-border)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
