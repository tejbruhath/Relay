'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, AlertTriangle, Key } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { CreateKeyModal } from '@/components/dashboard/CreateKeyModal'
import { useToast } from '@/hooks/useToast'
import { listApiKeys, revokeApiKey } from '@/lib/api'
import type { APIKey } from '@/lib/types'
import { ApiError } from '@/lib/types'

function formatDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function KeysPage() {
  const { addToast } = useToast()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await listApiKeys()
        setKeys(data)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load keys')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleCreated(key: APIKey) {
    setKeys((prev) => [key, ...prev])
  }

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`Revoke "${name}"? Any requests using this key will fail immediately.`)) return
    setRevokingId(id)
    try {
      await revokeApiKey(id)
      setKeys((prev) => prev.filter((k) => k.id !== id))
      addToast('API key revoked', 'success')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to revoke key'
      addToast(msg, 'error')
    } finally {
      setRevokingId(null)
    }
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
            API Keys
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            Authenticate your requests to the Relay API
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)} id="new-key-btn">
          <Plus size={16} />
          Generate key
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[8px] border border-[rgba(218,54,51,0.3)] bg-[rgba(218,54,51,0.08)]">
          <AlertTriangle size={16} className="text-[var(--error)]" />
          <p className="text-[13px] text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!error && keys.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 gap-4 border border-dashed border-[var(--bg-border)] rounded-[12px]">
          <div className="w-14 h-14 rounded-full bg-[rgba(255,69,0,0.08)] flex items-center justify-center">
            <Key size={24} className="text-[var(--text-muted)]" />
          </div>
          <div className="text-center">
            <p className="text-[16px] font-semibold text-[var(--text-primary)]">No API keys</p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              Generate a key to start sending events
            </p>
          </div>
          <Button variant="primary" onClick={() => setModalOpen(true)} id="first-key-btn">
            <Plus size={16} />
            Generate key
          </Button>
        </div>
      )}

      {/* Keys list */}
      {keys.length > 0 && (
        <Card padding="p-0">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--bg-border)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                <th className="text-left px-6 py-3 font-semibold">Name</th>
                <th className="text-left px-6 py-3 font-semibold">Prefix</th>
                <th className="text-left px-6 py-3 font-semibold">Status</th>
                <th className="text-left px-6 py-3 font-semibold">Last used</th>
                <th className="text-left px-6 py-3 font-semibold">Created</th>
                <th className="text-right px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k, i) => (
                <tr
                  key={k.id}
                  className={[
                    'border-b border-[var(--bg-border)] transition-colors',
                    i % 2 !== 0 ? 'bg-[rgba(28,35,51,0.3)]' : '',
                    'hover:bg-[rgba(255,69,0,0.03)]',
                  ].join(' ')}
                >
                  <td className="px-6 py-3 font-medium text-[var(--text-primary)]">
                    {k.name}
                  </td>
                  <td className="px-6 py-3 font-mono text-[var(--text-muted)]">
                    {k.prefix}••••
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={[
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                        k.is_active
                          ? 'bg-green-900/40 text-green-300 border-green-700/30'
                          : 'bg-gray-800/60 text-gray-500 border-gray-700/30',
                      ].join(' ')}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: k.is_active ? 'var(--success)' : 'var(--text-muted)',
                        }}
                        aria-hidden
                      />
                      {k.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[var(--text-muted)]">
                    {formatDate(k.last_used_at)}
                  </td>
                  <td className="px-6 py-3 text-[var(--text-muted)]">
                    {formatDate(k.created_at)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {k.is_active && (
                      <button
                        onClick={() => handleRevoke(k.id, k.name)}
                        disabled={revokingId === k.id}
                        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors disabled:opacity-50"
                        aria-label={`Revoke ${k.name}`}
                      >
                        <Trash2 size={13} />
                        {revokingId === k.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CreateKeyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
