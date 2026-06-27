import { Shield, RefreshCw, Inbox, Gauge, FileText, CreditCard } from 'lucide-react'

const FEATURES = [
  {
    icon: RefreshCw,
    title: 'Guaranteed Delivery',
    description:
      'Exponential backoff retries with full jitter. 6 attempts before dead-lettering. Your events always get a fair shot.',
  },
  {
    icon: Shield,
    title: 'HMAC Signing',
    description:
      'Every request signed with SHA-256. Your endpoints verify authenticity, not trust. Zero man-in-the-middle risk.',
  },
  {
    icon: Inbox,
    title: 'Dead Letter Queue',
    description:
      'Failed events don't vanish. Inspect, replay, or discard on your terms. Full payload preserved.',
  },
  {
    icon: Gauge,
    title: 'Per-Endpoint Rate Limits',
    description:
      'Protect slow consumers. Relay queues the overflow, not your app. Configurable per endpoint.',
  },
  {
    icon: FileText,
    title: 'Delivery Logs',
    description:
      'Every attempt logged: status code, response body, latency. Full audit trail for debugging and compliance.',
  },
  {
    icon: CreditCard,
    title: 'Razorpay Billing',
    description:
      'Usage-based plans. Pay as you scale. Cancel anytime. Billing that grows with your business.',
  },
]

export function Features() {
  return (
    <section
      className="py-24 px-6"
      id="features"
      aria-labelledby="features-heading"
    >
      <div className="max-w-6xl mx-auto">
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

        {/* 3×2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-[12px] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 group card-hover"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-[8px] bg-[rgba(255,69,0,0.1)] border border-[rgba(255,69,0,0.2)] flex items-center justify-center mb-4 group-hover:bg-[rgba(255,69,0,0.15)] transition-colors">
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
