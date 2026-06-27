'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { CopyButton } from '@/components/ui/CopyButton'
import { useToast } from '@/hooks/useToast'
import { register } from '@/lib/api'
import { setApiKeyAuth } from '@/lib/auth'
import { ApiError } from '@/lib/types'

export default function RegisterPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [apiKeyModal, setApiKeyModal] = useState<{
    open: boolean
    apiKey: string
    tenantId: string
    tenantName: string
  }>({ open: false, apiKey: '', tenantId: '', tenantName: '' })

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Company / name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
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
      const res = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        confirm_password: form.confirmPassword,
      })
      setApiKeyModal({
        open: true,
        apiKey: res.api_key,
        tenantId: res.tenant_id,
        tenantName: form.name,
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Registration failed'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleModalClose() {
    setApiKeyAuth({
      apiKey: apiKeyModal.apiKey,
      tenantId: apiKeyModal.tenantId,
      tenantName: apiKeyModal.tenantName,
    })
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Solid black background */}
      <div className="fixed inset-0 bg-[#07090F] pointer-events-none" aria-hidden />
      
      {/* Harsh orange bottom glow */}
      <div
        className="fixed bottom-0 left-0 right-0 h-[50vh] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,69,0,0.05) 60%, rgba(255,69,0,0.25) 100%)',
        }}
        aria-hidden
      />
      {/* Subtle noise texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(var(--bg-border) 1px, transparent 1px), linear-gradient(90deg, var(--bg-border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />
      {/* Glow orb */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(255,69,0,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 font-display font-bold text-[20px]">
          <div className="w-8 h-8 rounded-[7px] bg-[var(--accent-signal)] flex items-center justify-center">
            <Zap size={16} fill="white" className="text-white" />
          </div>
          Relay
        </Link>

        <div
          className="rounded-[16px] border border-[rgba(255,69,0,0.15)] p-8"
          style={{
            background: 'rgba(13,17,23,0.85)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 60px rgba(255,69,0,0.08), 0 1px 0 rgba(255,255,255,0.05) inset',
          }}
        >
          <h1 className="font-display font-bold text-[24px] text-[var(--text-primary)] mb-1">
            Create your account
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mb-8">
            Free tier: 1,000 deliveries/month. No credit card.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <Input
              id="register-name"
              label="Company or name"
              type="text"
              placeholder="Acme Corp"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
              autoComplete="organization"
              required
            />

            <Input
              id="register-email"
              label="Work email"
              type="email"
              placeholder="you@acme.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
              autoComplete="email"
              required
            />

            <div className="relative">
              <Input
                id="register-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-[38px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Input
              id="register-confirm-password"
              label="Confirm password"
              type="password"
              placeholder="Same as above"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              id="register-submit"
            >
              Create account
            </Button>
          </form>

          <p className="text-center text-[13px] text-[var(--text-secondary)] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--accent-signal)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* API Key display modal */}
      <Modal
        isOpen={apiKeyModal.open}
        onClose={handleModalClose}
        title="Save your API key"
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col gap-5">
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-[8px] border border-[rgba(210,153,34,0.3)]"
            style={{ background: 'rgba(210,153,34,0.08)' }}
          >
            <span className="text-[18px]">⚠️</span>
            <p className="text-[13px] text-[var(--warning)] leading-relaxed">
              <strong>Save this API key now.</strong> It won&apos;t be shown again.
              Store it somewhere safe (e.g. a password manager or secrets vault).
            </p>
          </div>

          <div>
            <p className="text-[12px] text-[var(--text-muted)] mb-2 uppercase tracking-wider font-semibold">
              Your API Key
            </p>
            <div className="flex items-center gap-2 p-3 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-base)] font-mono text-[13px] text-[var(--text-primary)] break-all">
              <span className="flex-1">{apiKeyModal.apiKey}</span>
              <CopyButton value={apiKeyModal.apiKey} label="Copy key" />
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={handleModalClose}
            id="register-modal-confirm"
          >
            I&apos;ve saved it — go to dashboard
          </Button>
        </div>
      </Modal>
    </div>
  )
}
