import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: '/mo',
    features: [
      '1,000 deliveries',
      '1 endpoint',
      '7-day log retention',
      'Community support',
    ],
    cta: 'Get started',
    highlighted: false,
    plan: 'free',
  },
  {
    name: 'Pro',
    price: '₹999',
    period: '/mo',
    features: [
      '50,000 deliveries',
      '25 endpoints',
      '30-day log retention',
      'Email support',
    ],
    cta: 'Get started',
    highlighted: true,
    plan: 'pro',
  },
  {
    name: 'Scale',
    price: '₹4,999',
    period: '/mo',
    features: [
      'Unlimited deliveries',
      'Unlimited endpoints',
      '90-day log retention',
      'Priority support',
    ],
    cta: 'Get started',
    highlighted: false,
    plan: 'scale',
  },
]

export function Pricing() {
  return (
    <section
      className="py-24 px-6 bg-[var(--bg-surface)]"
      id="pricing"
      aria-labelledby="pricing-heading"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[12px] tracking-widest uppercase text-[var(--text-muted)] mb-4 font-semibold">
            Simple pricing
          </p>
          <h2
            id="pricing-heading"
            className="font-display font-bold text-[var(--text-primary)]"
            style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}
          >
            Pay as you scale
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            No hidden fees. No per-seat pricing. Just deliveries.
          </p>
        </div>

        {/* 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={[
                'rounded-[12px] border p-8 flex flex-col relative overflow-hidden transition-all duration-150',
                plan.highlighted
                  ? 'border-[var(--accent-signal)] bg-[var(--bg-base)] shadow-[0_0_40px_rgba(255,69,0,0.12)]'
                  : 'border-[var(--bg-border)] bg-[var(--bg-surface)] card-hover',
              ].join(' ')}
            >
              {plan.highlighted && (
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background:
                      'linear-gradient(90deg, var(--accent-signal), var(--accent-glow))',
                  }}
                />
              )}

              {plan.highlighted && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[var(--accent-signal)] text-white tracking-wider">
                  Most popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="font-display font-bold text-[18px] text-[var(--text-primary)] mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-[42px] text-[var(--text-primary)]">
                    {plan.price}
                  </span>
                  <span className="text-[var(--text-muted)] text-[14px]">
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      size={15}
                      className="mt-0.5 shrink-0 text-[var(--success)]"
                    />
                    <span className="text-[14px] text-[var(--text-secondary)]">
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href="/register">
                <Button
                  variant={plan.highlighted ? 'primary' : 'ghost'}
                  fullWidth
                  size="md"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[13px] text-[var(--text-muted)] mt-8">
          All plans include HMAC signing, retries, dead-letter queue, and delivery logs.
        </p>
      </div>
    </section>
  )
}
