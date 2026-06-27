'use client'

import { Shield, RefreshCw, Inbox, Gauge, FileText, CreditCard, Zap, Lock, BarChart2, Globe, Clock, Bell } from 'lucide-react'

const FEATURES = [
  {
    icon: RefreshCw,
    title: 'Guaranteed Delivery',
    description:
      'Exponential backoff retries with full jitter. 6 attempts before dead-lettering. Your events always get a fair shot at delivery.',
  },
  {
    icon: Shield,
    title: 'HMAC-SHA256 Signing',
    description:
      'Every request signed cryptographically. Your endpoints verify authenticity, not trust. Zero man-in-the-middle risk. Replay-attack resistant.',
  },
  {
    icon: Inbox,
    title: 'Dead Letter Queue',
    description:
      "Failed events don't vanish into the void. Inspect full payloads, replay to original endpoints, or route to fallback. Audit trail always intact.",
  },
  {
    icon: Gauge,
    title: 'Per-Endpoint Rate Limits',
    description:
      'Protect slow consumers. Relay queues the overflow, not your app. Configurable per endpoint. Your SLA stays clean.',
  },
  {
    icon: FileText,
    title: 'Full Delivery Logs',
    description:
      'Every attempt logged: HTTP status, response body, latency, retry number. Compliance-grade audit trail out of the box.',
  },
  {
    icon: CreditCard,
    title: 'Razorpay Billing',
    description:
      'Usage-based plans. Pay as you scale. Cancel anytime. Billing that grows with your business, not against it.',
  },
  {
    icon: Zap,
    title: 'Sub-50ms Acknowledgement',
    description:
      'Relay returns 202 Accepted in under 50ms. Your producer is never blocked waiting for delivery confirmation. Fire and forget — safely.',
  },
  {
    icon: Lock,
    title: 'Idempotency Keys',
    description:
      'Deduplicate events at ingestion with a 24-hour idempotency window. Send twice, deliver once. Safe for retrying from any client.',
  },
  {
    icon: BarChart2,
    title: 'Usage Analytics',
    description:
      'Real-time delivery count, quota tracking, and plan utilization. Know exactly where you stand before you hit a limit.',
  },
  {
    icon: Globe,
    title: 'Multi-Endpoint Routing',
    description:
      'Route events to multiple endpoints per tenant. Each endpoint gets its own signing secret, rate limit, and delivery log.',
  },
  {
    icon: Clock,
    title: 'Scheduled Retries',
    description:
      'Celery-powered retry scheduling with configurable backoff. Failed deliveries retry at the right time, not immediately. No thundering herd.',
  },
  {
    icon: Bell,
    title: 'AI Autonomous Alerts',
    description:
      'Intelligent observability monitors delivery health. Anomaly detection flags degrading endpoints before they breach SLA. Your on-call stays quiet.',
  },
]

// Duplicate for seamless infinite scroll
const CAROUSEL_ITEMS = [...FEATURES, ...FEATURES]

export function Features() {
  return (
    <section
      className="py-24 overflow-hidden"
      id="features"
      aria-labelledby="features-heading"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[12px] tracking-widest uppercase text-[var(--text-muted)] mb-4 font-semibold">
            Built for reliability
          </p>
          <h2
            id="features-heading"
            className="font-display font-bold text-[var(--text-primary)]"
            style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}
          >
            Everything your webhooks need.
            <br />
            <span className="gradient-text">Nothing they don&apos;t.</span>
          </h2>
        </div>
      </div>

      {/* Infinite scrolling carousel */}
      <div className="relative">
        {/* Left edge fade */}
        <div
          className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, var(--bg-base) 0%, transparent 100%)',
          }}
        />
        {/* Right edge fade */}
        <div
          className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to left, var(--bg-base) 0%, transparent 100%)',
          }}
        />

        <div
          className="flex gap-6 w-max"
          style={{
            animation: 'carouselScroll 40s linear infinite',
          }}
          onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
          onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
        >
          {CAROUSEL_ITEMS.map(({ icon: Icon, title, description }, idx) => (
            <div
              key={`${title}-${idx}`}
              className="rounded-[12px] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 group card-hover shrink-0 relative overflow-hidden"
              style={{ width: '280px' }}
            >
              {/* Subtle corner glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[12px]"
                style={{
                  background: 'radial-gradient(ellipse at top left, rgba(255,69,0,0.06) 0%, transparent 60%)',
                }}
              />
              {/* Icon */}
              <div className="w-10 h-10 rounded-[8px] bg-[rgba(255,69,0,0.1)] border border-[rgba(255,69,0,0.2)] flex items-center justify-center mb-4 group-hover:bg-[rgba(255,69,0,0.18)] transition-colors">
                <Icon size={18} className="text-[var(--accent-signal)]" />
              </div>

              <h3 className="font-display font-semibold text-[17px] text-[var(--text-primary)] mb-2">
                {title}
              </h3>
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
