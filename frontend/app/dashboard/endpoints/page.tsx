'use client'

import { useEffect, useState } from 'react'
import { Plus, AlertTriangle, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EndpointCard } from '@/components/dashboard/EndpointCard'
import { CreateEndpointModal } from '@/components/dashboard/CreateEndpointModal'
import { listEndpoints } from '@/lib/api'
import type { WebhookEndpoint } from '@/lib/types'
import { ApiError } from '@/lib/types'

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await listEndpoints()
        setEndpoints(data)
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to load endpoints'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleCreated(endpoint: WebhookEndpoint) {
    setEndpoints((prev) => [endpoint, ...prev])
  }

  function handleDelete(id: string) {
    setEndpoints((prev) => prev.filter((e) => e.id !== id))
  }

  function handleUpdate(updated: WebhookEndpoint) {
    setEndpoints((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="page-transition flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[28px] text-[var(--text-primary)]">
            Endpoints
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            Webhook targets Relay delivers events to
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setModalOpen(true)}
          id="new-endpoint-btn"
        >
          <Plus size={16} />
          New endpoint
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[8px] border border-[rgba(218,54,51,0.3)] bg-[rgba(218,54,51,0.08)]">
          <AlertTriangle size={16} className="text-[var(--error)]" />
          <p className="text-[13px] text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!error && endpoints.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 gap-4 border border-dashed border-[var(--bg-border)] rounded-[12px]">
          <div className="w-14 h-14 rounded-full bg-[rgba(255,69,0,0.08)] flex items-center justify-center">
            <Link2 size={24} className="text-[var(--text-muted)]" />
          </div>
          <div className="text-center">
            <p className="text-[16px] font-semibold text-[var(--text-primary)]">
              No endpoints yet
            </p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              Create your first endpoint to start receiving events
            </p>
          </div>
          <Button variant="primary" onClick={() => setModalOpen(true)} id="first-endpoint-btn">
            <Plus size={16} />
            Create endpoint
          </Button>
        </div>
      )}

      {/* Endpoint grid */}
      {endpoints.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {endpoints.map((ep) => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      <CreateEndpointModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
