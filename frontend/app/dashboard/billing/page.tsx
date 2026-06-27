'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { Check, CreditCard, AlertTriangle, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { getSubscription, getUsage, createSubscription } from '@/lib/api'
import type { Subscription, UsageResponse, Plan } from '@/lib/types'
import { ApiError } from '@/lib/types'
import { useToast } from '@/hooks/useToast'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const PLAN_FEATURES = {
  free: [
    '1,000 deliveries / month',
    '1 endpoint',
    '7-day log retention',
    'Community support',
  ],
  pro: [
    '50,000 deliveries / month',
    '25 endpoints',
    '30-day log retention',
    'Email support',
  ],
  scale: [
    'Unlimited deliveries',
    'Unlimited endpoints',
    '90-day log retention',
    'Priority support',
  ],
}

const PLAN_PRICES = {
  free: '₹0',
  pro: '₹999',
  scale: '₹4,999',
}

export default function BillingPage() {
  const { addToast } = useToast()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null)

  const load = async () => {
    try {
      const [subData, usageData] = await Promise.all([
        getSubscription(),
        getUsage(),
      ])
      setSubscription(subData)
      setUsage(usageData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load billing details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleUpgrade(targetPlan: Plan) {
    if (targetPlan === 'free') return
    setCheckoutLoading(targetPlan)
    try {
      const res = await createSubscription(targetPlan as 'pro' | 'scale')

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || res.razorpay_key_id,
        subscription_id: res.subscription_id,
        name: 'Relay',
        description: `${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)} Plan`,
        handler: function () {
          addToast('Subscription successfully updated!', 'success')
          load()
        },
        theme: {
          color: '#FF4500',
        },
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', function () {
        addToast('Payment failed. Please try again.', 'error')
      })
      rzp.open()

    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to initiate checkout'
      addToast(msg, 'error')
    } finally {
      setCheckoutLoading(null)
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
      {/* Razorpay script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-[28px] text-[var(--text-primary)]">
          Billing & Usage
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">
          Manage your subscription and view usage
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[8px] border border-[rgba(218,54,51,0.3)] bg-[rgba(218,54,51,0.08)]">
          <AlertTriangle size={16} className="text-[var(--error)]" />
          <p className="text-[13px] text-[var(--error)]">{error}</p>
        </div>
      )}

      {subscription && usage && (
        <>
          {/* Current plan summary */}
          <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[10px] bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.2)] flex items-center justify-center text-[var(--accent-blue)]">
                <CreditCard size={24} />
              </div>
              <div>
                <p className="text-[13px] text-[var(--text-muted)] mb-1">Current plan</p>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[22px] text-[var(--text-primary)] capitalize">
                    {subscription.plan}
                  </span>
                  <span
                    className={[
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      subscription.status === 'active'
                        ? 'bg-green-900/40 text-green-300 border border-green-700/30'
                        : 'bg-gray-800/60 text-gray-500 border border-gray-700/30',
                    ].join(' ')}
                  >
                    {subscription.status}
                  </span>
                </div>
              </div>
            </div>
            
            {subscription.plan !== 'free' && (
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[12px] text-[var(--text-muted)]">Current period</p>
                  <p className="text-[13px] font-medium text-[var(--text-primary)] mt-0.5">
                    {formatDate(subscription.current_period_start)} — {formatDate(subscription.current_period_end)}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Usage */}
          <Card>
            <h2 className="font-display font-semibold text-[16px] text-[var(--text-primary)] mb-6">
              Usage this period
            </h2>
            <div className="max-w-2xl">
              <UsageBar
                count={usage.delivery_count}
                quota={usage.delivery_quota}
                plan={usage.plan}
              />
            </div>
          </Card>

          {/* Available plans */}
          <div>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              Available plans
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['free', 'pro', 'scale'] as Plan[]).map((p) => {
                const isActive = subscription.plan === p
                const isHighlighted = p === 'pro' && subscription.plan === 'free'
                
                return (
                  <Card
                    key={p}
                    padding="p-6"
                    className={[
                      'flex flex-col relative overflow-hidden transition-all duration-150',
                      isActive ? 'border-[var(--bg-border)] bg-[rgba(255,255,255,0.02)]' : '',
                      isHighlighted ? 'border-[var(--accent-signal)] bg-[var(--bg-base)] shadow-[0_0_30px_rgba(255,69,0,0.08)]' : '',
                    ].join(' ')}
                  >
                    {isHighlighted && (
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--accent-signal)] to-[var(--accent-glow)]" />
                    )}

                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display font-bold text-[18px] text-[var(--text-primary)] capitalize">
                          {p}
                        </h3>
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--success)] bg-[rgba(46,160,67,0.1)] px-2 py-0.5 rounded-full border border-[rgba(46,160,67,0.2)]">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display font-bold text-[32px] text-[var(--text-primary)]">
                          {PLAN_PRICES[p]}
                        </span>
                        <span className="text-[var(--text-muted)] text-[13px]">/mo</span>
                      </div>
                    </div>

                    <ul className="flex flex-col gap-3 mb-8 flex-1">
                      {PLAN_FEATURES[p].map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <Check size={14} className="mt-0.5 shrink-0 text-[var(--success)]" />
                          <span className="text-[13px] text-[var(--text-secondary)]">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isActive ? (
                      <Button variant="secondary" fullWidth disabled>
                        Current plan
                      </Button>
                    ) : (
                      <Button
                        variant={isHighlighted ? 'primary' : 'ghost'}
                        fullWidth
                        loading={checkoutLoading === p}
                        onClick={() => handleUpgrade(p)}
                        id={`upgrade-${p}-btn`}
                      >
                        {p === 'free' ? 'Downgrade to Free' : 'Upgrade'}
                      </Button>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
