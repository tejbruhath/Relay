'use client'

import { useState, FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { useToast } from '@/hooks/useToast'
import { createEndpoint } from '@/lib/api'
import type { CreateEndpointResponse, WebhookEndpoint } from '@/lib/types'
import { ApiError } from '@/lib/types'

interface CreateEndpointModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (endpoint: WebhookEndpoint) => void
}

export function CreateEndpointModal({
  isOpen,
  onClose,
  onCreated,
}: CreateEndpointModalProps) {
  const { addToast } = useToast()
  const [form, setForm] = useState({
    url: '',
    description: '',
    rate_limit_per_minute: '60',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  // After creation — show signing_secret once
  const [created, setCreated] = useState<CreateEndpointResponse | null>(null)

  function validate() {
    const e: Record<string, string> = {}
    if (!form.url.trim()) {
      e.url = 'URL is required'
    } else {
      try {
        new URL(form.url)
      } catch {
        e.url = 'Enter a valid URL (https://...)'
      }
    }
    const rate = Number(form.rate_limit_per_minute)
    if (isNaN(rate) || rate < 1 || rate > 1000) {
      e.rate_limit_per_minute = 'Must be between 1 and 1000'
    }
    return e
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const res = await createEndpoint({
        url: form.url.trim(),
        description: form.description.trim() || undefined,
        rate_limit_per_minute: Number(form.rate_limit_per_minute),
      })
      setCreated(res)
      // Notify parent without signing_secret (never leave it in parent state)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { signing_secret: _secret, ...endpointData } = res
      onCreated(endpointData as WebhookEndpoint)
      addToast('Endpoint created!', 'success')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create endpoint'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setCreated(null)
    setForm({ url: '', description: '', rate_limit_per_minute: '60' })
    setErrors({})
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={created ? 'Endpoint created' : 'New endpoint'}
    >
      {created ? (
        /* ── Success state — show signing secret once ── */
        <div className="flex flex-col gap-5">
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-[8px] border border-[rgba(210,153,34,0.3)]"
            style={{ background: 'rgba(210,153,34,0.08)' }}
          >
            <span className="text-[18px]">⚠️</span>
            <p className="text-[13px] text-[var(--warning)] leading-relaxed">
              <strong>Copy your signing secret now.</strong> It will never be shown again.
            </p>
          </div>
          <div>
            <p className="text-[12px] text-[var(--text-muted)] mb-2 uppercase tracking-wider font-semibold">
              Signing Secret
            </p>
            <div className="flex items-center gap-2 p-3 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-base)] font-mono text-[12px] text-[var(--text-primary)] break-all">
              <span className="flex-1">{created.signing_secret}</span>
              <CopyButton value={created.signing_secret} label="Copy" />
            </div>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Endpoint URL: <span className="font-mono text-[var(--text-primary)]">{created.url}</span>
          </p>
          <Button variant="primary" fullWidth onClick={handleClose} id="endpoint-created-close">
            Done
          </Button>
        </div>
      ) : (
        /* ── Create form ── */
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <Input
            id="new-endpoint-url"
            label="Endpoint URL"
            type="url"
            placeholder="https://your-app.com/webhooks"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            error={errors.url}
            required
          />
          <Input
            id="new-endpoint-description"
            label="Description (optional)"
            type="text"
            placeholder="Production customer webhooks"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
          <Input
            id="new-endpoint-rate-limit"
            label="Rate limit per minute"
            type="number"
            placeholder="60"
            min="1"
            max="1000"
            value={form.rate_limit_per_minute}
            onChange={(e) =>
              setForm({ ...form, rate_limit_per_minute: e.target.value })
            }
            error={errors.rate_limit_per_minute}
            helpText="Max requests per minute Relay will send to this endpoint"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" fullWidth onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              id="create-endpoint-submit"
            >
              Create endpoint
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
