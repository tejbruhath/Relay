'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'
import { login } from '@/lib/api'
import { setApiKeyAuth } from '@/lib/auth'
import { ApiError } from '@/lib/types'

export default function LoginPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (!form.email.trim()) e.email = 'Email is required'
    if (!form.password) e.password = 'Password is required'
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
      const res = await login({ email: form.email, password: form.password })
      // Login returns a JWT + tenant info; store tenant context
      // The JWT is stored alongside tenantId for dashboard use
      setApiKeyAuth({
        apiKey: res.token,     // We use the JWT as the auth token for API calls
        tenantId: res.tenant_id,
        tenantName: res.tenant_name,
      })
      addToast('Welcome back!', 'success')
      router.push('/dashboard')
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : 'Login failed. Check your credentials.'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
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
      {/* Subtle grid */}
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

      <div className="relative w-full max-w-md animate-fade-up">
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
            Welcome back
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mb-8">
            Sign in to your Relay dashboard
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <Input
              id="login-email"
              label="Email"
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
                id="login-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
                autoComplete="current-password"
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              id="login-submit"
            >
              Sign in
            </Button>
          </form>

          <p className="text-center text-[13px] text-[var(--text-secondary)] mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[var(--accent-signal)] hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
