'use client'

import { useState } from 'react'
import { ExternalLink, Trash2, Copy, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import type { WebhookEndpoint } from '@/lib/types'
import { updateEndpoint, deleteEndpoint } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { ApiError } from '@/lib/types'

interface EndpointCardProps {
  endpoint: WebhookEndpoint
  onDelete: (id: string) => void
  onUpdate: (updated: WebhookEndpoint) => void
}

export function EndpointCard({ endpoint, onDelete, onUpdate }: EndpointCardProps) {
  const { addToast } = useToast()
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [prefixCopied, setPrefixCopied] = useState(false)

  async function handleToggle() {
    setToggling(true)
    try {
      const updated = await updateEndpoint(endpoint.id, {
        is_active: !endpoint.is_active,
      })
      onUpdate(updated)
      addToast(
        updated.is_active ? 'Endpoint activated' : 'Endpoint paused',
        'success',
      )
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update'
      addToast(msg, 'error')
    } finally {
      setToggling(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this endpoint? All associated events will be retained.')) return
    setDeleting(true)
    try {
      await deleteEndpoint(endpoint.id)
      onDelete(endpoint.id)
      addToast('Endpoint deleted', 'success')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete'
      addToast(msg, 'error')
    } finally {
      setDeleting(false)
    }
  }

  function copyPrefix() {
    navigator.clipboard.writeText(endpoint.secret_prefix + '...')
    setPrefixCopied(true)
    setTimeout(() => setPrefixCopied(false), 2000)
    addToast('Secret prefix copied', 'success')
  }

  return (
    <div className="rounded-[12px] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5 flex flex-col gap-4 card-hover">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: endpoint.is_active ? 'var(--success)' : 'var(--text-muted)',
              }}
              aria-hidden
            />
            <a
              href={endpoint.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-mono text-[var(--accent-blue)] hover:underline truncate flex items-center gap-1"
              title={endpoint.url}
            >
              <span className="truncate max-w-[240px]">{endpoint.url}</span>
              <ExternalLink size={11} className="shrink-0" />
            </a>
          </div>
          {endpoint.description && (
            <p className="text-[12px] text-[var(--text-muted)] truncate">
              {endpoint.description}
            </p>
          )}
        </div>

        {/* Active toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-label={endpoint.is_active ? 'Pause endpoint' : 'Activate endpoint'}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        >
          {endpoint.is_active ? (
            <ToggleRight size={22} className="text-[var(--success)]" />
          ) : (
            <ToggleLeft size={22} />
          )}
        </button>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-[12px] text-[var(--text-muted)]">
        <span>
          Rate limit:{' '}
          <span className="text-[var(--text-secondary)]">
            {endpoint.rate_limit_per_minute}/min
          </span>
        </span>
      </div>

      {/* Secret prefix */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-[var(--bg-base)] border border-[var(--bg-border)]">
        <span className="text-[11px] text-[var(--text-muted)] shrink-0">Signing secret:</span>
        <span className="flex-1 font-mono text-[12px] text-[var(--text-secondary)]">
          {endpoint.secret_prefix}••••••••
        </span>
        <button
          onClick={copyPrefix}
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Copy secret prefix"
        >
          {prefixCopied ? (
            <Check size={13} className="text-[var(--success)]" />
          ) : (
            <Copy size={13} />
          )}
        </button>
      </div>

      {/* Delete */}
      <div className="flex justify-end">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors disabled:opacity-50"
          aria-label="Delete endpoint"
        >
          <Trash2 size={13} />
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
