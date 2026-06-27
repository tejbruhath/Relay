'use client'

import { useState, FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { useToast } from '@/hooks/useToast'
import { createApiKey } from '@/lib/api'
import type { APIKey, CreateKeyResponse } from '@/lib/types'
import { ApiError } from '@/lib/types'

interface CreateKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (key: APIKey) => void
}

export function CreateKeyModal({ isOpen, onClose, onCreated }: CreateKeyModalProps) {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<CreateKeyResponse | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('Key name is required')
      return
    }
    setNameError('')
    setLoading(true)
    try {
      const res = await createApiKey({ name: name.trim() })
      setCreated(res)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { api_key: _key, ...keyData } = res
      onCreated(keyData as APIKey)
      addToast('API key created!', 'success')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create key'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setCreated(null)
    setName('')
    setNameError('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={created ? 'API key created' : 'Generate API key'}
    >
      {created ? (
        <div className="flex flex-col gap-5">
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-[8px] border border-[rgba(210,153,34,0.3)]"
            style={{ background: 'rgba(210,153,34,0.08)' }}
          >
            <span className="text-[18px]">⚠️</span>
            <p className="text-[13px] text-[var(--warning)] leading-relaxed">
              <strong>This is the only time we&apos;ll show this key.</strong> Save it to your secrets vault now.
            </p>
          </div>
          <div>
            <p className="text-[12px] text-[var(--text-muted)] mb-2 uppercase tracking-wider font-semibold">
              API Key — {created.name}
            </p>
            <div className="flex items-center gap-2 p-3 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-base)] font-mono text-[12px] text-[var(--text-primary)] break-all">
              <span className="flex-1">{created.api_key}</span>
              <CopyButton value={created.api_key} label="Copy" />
            </div>
          </div>
          <Button variant="primary" fullWidth onClick={handleClose} id="key-created-done">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <Input
            id="new-key-name"
            label="Key name"
            type="text"
            placeholder="e.g. Production, CI/CD pipeline"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            helpText="A descriptive name to identify this key"
            required
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
              id="create-key-submit"
            >
              Generate key
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
