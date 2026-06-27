'use client'

import { useEffect, useRef, useState } from 'react'

// ─── Panel content — 5 slides ─────────────────────────────────────────────────
const PANELS = [
  {
    step: '01',
    title: 'You fire an event',
    description:
      'POST a JSON payload to the Relay API with your event type, endpoint target, and idempotency key. Relay returns 202 Accepted in under 50ms — your request is queued, signed, and dispatched asynchronously. Zero coupling between your producer and consumer.',
  },
  {
    step: '02',
    title: 'Relay queues & signs it',
    description:
      'Your event enters a Redis-backed durable queue. Relay computes an HMAC-SHA256 signature using your signing secret and stamps every delivery attempt with X-Relay-Signature. Man-in-the-middle attacks are structurally impossible. Every byte is verified end-to-end.',
  },
  {
    step: '03',
    title: 'Intelligent retry engine',
    description:
      'Relay POSTs to your consumer endpoint with exponential backoff and full jitter. Up to 6 delivery attempts across 2 hours. Every attempt is logged with HTTP status, latency, and response body. Non-2xx responses automatically trigger the next retry.',
  },
  {
    step: '04',
    title: 'Dead letter queue rescue',
    description:
      'Events that exhaust all retries are moved to the Dead Letter Queue — never silently dropped. Inspect full payloads, replay to the original endpoint, or route to a fallback. Your audit trail is always complete. Zero data loss, zero surprises.',
  },
  {
    step: '05',
    title: 'AI-automated autonomous alerts',
    description:
      'Relay\'s intelligent observability layer monitors delivery health in real time. Anomaly detection flags endpoints with degrading success rates before they breach SLA. Proactive alerts are dispatched autonomously — no dashboards to babysit. Your on-call stays quiet.',
  },
]

// ─── Animated Terminal (Panel 1) ──────────────────────────────────────────────
const TERMINAL_LINES = [
  'curl -X POST https://api.relay.dev/v1/events \\',
  '  -H "X-Relay-Key: rk_live_••••••••" \\',
  '  -H "Content-Type: application/json" \\',
  '  -H "Idempotency-Key: inv-99123-attempt-1" \\',
  "  -d '{",
  '    "endpoint_id": "ep_01HX3K...",',
  '    "event_type": "invoice.paid",',
  '    "payload": {',
  '      "invoice_id": "inv_99123",',
  '      "amount": 4999,',
  '      "currency": "INR"',
  '    }',
  "  }'",
]

function TerminalPanel() {
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    setVisibleLines(0)
    let i = 0
    const id = setInterval(() => {
      i++
      setVisibleLines(i)
      // Wait for a bit after finishing, then reset to loop
      if (i > TERMINAL_LINES.length + 20) {
        i = 0
        setVisibleLines(0)
      }
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      {/* Ring animation behind terminal */}
      <div className="relative">
        <div
          className="absolute -inset-6 rounded-[24px] border border-[rgba(255,69,0,0.15)]"
          style={{ animation: 'ringPulse 3s ease-in-out infinite' }}
        />
        <div
          className="absolute -inset-12 rounded-[32px] border border-[rgba(255,69,0,0.07)]"
          style={{ animation: 'ringPulse 3s ease-in-out 1s infinite' }}
        />
        <div className="w-full max-w-lg rounded-[12px] border border-[var(--bg-border)] overflow-hidden relative z-10">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-[var(--bg-border)]">
            <span className="w-3 h-3 rounded-full bg-[#da3633]" />
            <span className="w-3 h-3 rounded-full bg-[#d29922]" />
            <span className="w-3 h-3 rounded-full bg-[#2ea043]" />
            <span className="ml-2 text-[12px] text-[var(--text-muted)]">terminal</span>
          </div>
          {/* Body */}
          <div className="p-4 bg-[#0d1117] font-mono text-[13px] leading-relaxed min-h-[260px]">
            {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
              <div key={i} className="flex">
                <span className="text-[var(--accent-signal)] mr-2 select-none">$</span>
                <span
                  className={
                    line.startsWith('  ')
                      ? 'text-[var(--text-secondary)]'
                      : 'text-[var(--text-primary)]'
                  }
                >
                  {line}
                </span>
              </div>
            ))}
            {visibleLines < TERMINAL_LINES.length && (
              <span
                className="inline-block w-2 h-4 bg-[var(--accent-signal)] ml-4"
                style={{ animation: 'typeCursor 1s step-end infinite' }}
              />
            )}
            {visibleLines >= TERMINAL_LINES.length && (
              <div className="mt-3 text-[var(--success)]">
                → 202 Accepted · event_id: evt_01HX3K9M · queued_at: {new Date().toISOString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Queue + HMAC Panel (Panel 2) ─────────────────────────────────────────────
function QueuePanel() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-8">
      {/* Ring ring ring */}
      <div className="relative flex items-center justify-center mb-4">
        <div
          className="absolute w-32 h-32 rounded-full border border-[rgba(255,69,0,0.2)]"
          style={{ animation: 'ringPulse 2.5s ease-in-out infinite' }}
        />
        <div
          className="absolute w-48 h-48 rounded-full border border-[rgba(255,69,0,0.08)]"
          style={{ animation: 'ringPulse 2.5s ease-in-out 0.8s infinite' }}
        />
        {/* Queue visualization */}
        <div className="flex items-center gap-3 z-10">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-12 h-12 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-surface)] flex items-center justify-center"
              style={{
                opacity: 1 - i * 0.2,
                transform: `scale(${1 - i * 0.05})`,
                transition: 'all 0.3s ease',
                boxShadow: tick % 4 === i ? '0 0 12px rgba(255,69,0,0.4)' : 'none',
              }}
            >
              <span className="text-[10px] text-[var(--text-muted)] font-mono">evt</span>
            </div>
          ))}
          <div className="flex gap-1 mx-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--accent-signal)]"
                style={{
                  animation: `dotMove 2s ease-in-out ${i * 0.3}s infinite`,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
          <div className="w-12 h-12 rounded-[8px] border-2 border-[var(--accent-signal)] bg-[rgba(255,69,0,0.08)] flex items-center justify-center">
            <span className="text-[10px] text-[var(--accent-signal)] font-mono font-bold">OUT</span>
          </div>
        </div>
      </div>

      {/* HMAC badge */}
      <div
        className="flex items-center gap-3 px-6 py-3 rounded-[12px] border border-[rgba(37,99,235,0.4)]"
        style={{ background: 'rgba(37,99,235,0.08)' }}
      >
        <div className="w-8 h-8 rounded-full bg-[rgba(37,99,235,0.2)] flex items-center justify-center">
          <span className="text-[14px]">🔐</span>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-[var(--accent-blue)]">
            HMAC-SHA256
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
            X-Relay-Signature: sha256=3af5c...
          </div>
        </div>
      </div>

      <p className="text-[13px] text-[var(--text-muted)] text-center max-w-xs">
        Every payload is cryptographically signed before delivery. Your endpoints verify the signature — zero implicit trust.
      </p>
    </div>
  )
}

// ─── Retry Engine Panel (Panel 3) ─────────────────────────────────────────────
function RetryPanel() {
  const attempts = [
    { n: 1, status: 'failure', code: 503, delay: '0s' },
    { n: 2, status: 'failure', code: 502, delay: '30s' },
    { n: 3, status: 'failure', code: 500, delay: '120s' },
    { n: 4, status: 'success', code: 200, delay: '480s' },
  ]

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm space-y-2">
        {attempts.map((a, i) => (
          <div
            key={a.n}
            className="flex items-center gap-3 px-4 py-2.5 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-surface)]"
            style={{
              animation: `fadeUp 400ms ease-out ${i * 150}ms both`,
              borderColor: a.status === 'success' ? 'rgba(46,160,67,0.4)' : 'rgba(218,54,51,0.2)',
            }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{
                background: a.status === 'success' ? 'rgba(46,160,67,0.15)' : 'rgba(218,54,51,0.15)',
                color: a.status === 'success' ? 'var(--success)' : 'var(--error)',
              }}
            >
              {a.n}
            </span>
            <span className="text-[12px] font-mono text-[var(--text-secondary)] flex-1">
              HTTP {a.code}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">+{a.delay}</span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: a.status === 'success' ? 'var(--success)' : 'var(--error)' }}
            >
              {a.status}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[13px] text-[var(--text-muted)] text-center max-w-xs">
        Exponential backoff with full jitter. 6 attempts. Every failure logged with latency, status, and response body.
      </p>
    </div>
  )
}

// ─── DLQ Panel (Panel 4) ──────────────────────────────────────────────────────
function DLQPanel() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
      {/* DLQ stream visualization */}
      <div className="relative">
        <div
          className="absolute -inset-4 rounded-[20px] border border-[rgba(218,54,51,0.2)]"
          style={{ animation: 'ringPulse 3s ease-in-out infinite' }}
        />
        <div
          className="w-full max-w-sm rounded-[12px] border border-[rgba(218,54,51,0.3)] overflow-hidden"
          style={{ background: 'rgba(218,54,51,0.05)' }}
        >
          <div className="px-4 py-2 border-b border-[rgba(218,54,51,0.2)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--error)]" style={{ animation: 'pulseGlow 2s infinite' }} />
            <span className="text-[12px] font-mono text-[var(--error)]">relay:dlq stream</span>
          </div>
          <div className="p-4 space-y-2 font-mono text-[12px]">
            {['evt_abc123 · invoice.paid · 6 attempts', 'evt_def456 · order.created · 6 attempts', 'evt_ghi789 · payment.refunded · 6 attempts'].map((line, i) => (
              <div key={i} className="flex items-center gap-2 text-[var(--text-secondary)]">
                <span className="text-[var(--error)]">dead</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-[rgba(218,54,51,0.2)] flex gap-2">
            <button className="px-3 py-1 rounded text-[11px] font-semibold bg-[rgba(255,69,0,0.15)] text-[var(--accent-glow)] border border-[rgba(255,69,0,0.3)]">
              Replay all
            </button>
            <button className="px-3 py-1 rounded text-[11px] font-semibold bg-[rgba(37,99,235,0.1)] text-[var(--accent-blue)] border border-[rgba(37,99,235,0.3)]">
              Inspect
            </button>
          </div>
        </div>
      </div>
      <p className="text-[13px] text-[var(--text-muted)] text-center max-w-xs">
        Dead events are never silently dropped. Full payload preserved. Replay on demand. Complete audit trail.
      </p>
    </div>
  )
}

// ─── AI Alerts Panel (Panel 5) ────────────────────────────────────────────────
function AIAlertsPanel() {
  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPulse(p => (p + 1) % 3), 1000)
    return () => clearInterval(id)
  }, [])

  const metrics = [
    { label: 'Endpoint success rate', value: '98.2%', trend: '▼ 1.8%', alert: true },
    { label: 'P99 delivery latency', value: '312ms', trend: '▲ 45ms', alert: false },
    { label: 'DLQ depth', value: '0', trend: '— stable', alert: false },
  ]

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
      {/* Radar ring animation */}
      <div className="relative flex items-center justify-center mb-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="absolute rounded-full border"
            style={{
              width: `${80 + i * 60}px`,
              height: `${80 + i * 60}px`,
              borderColor: `rgba(255,69,0,${0.3 - i * 0.08})`,
              animation: `ringPulse 2s ease-in-out ${i * 0.6}s infinite`,
            }}
          />
        ))}
        <div className="relative z-10 w-16 h-16 rounded-full bg-[rgba(255,69,0,0.12)] border border-[rgba(255,69,0,0.4)] flex items-center justify-center">
          <span className="text-[26px]">🤖</span>
        </div>
      </div>

      {/* Alert metrics */}
      <div className="w-full max-w-sm space-y-2">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="flex items-center justify-between px-4 py-2.5 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-surface)]"
            style={{
              borderColor: m.alert && pulse === i ? 'rgba(255,69,0,0.5)' : undefined,
              boxShadow: m.alert && pulse === i ? '0 0 10px rgba(255,69,0,0.2)' : 'none',
              transition: 'all 0.3s',
            }}
          >
            <span className="text-[12px] text-[var(--text-secondary)]">{m.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-mono font-bold text-[var(--text-primary)]">{m.value}</span>
              <span
                className="text-[11px]"
                style={{ color: m.alert ? 'var(--error)' : 'var(--text-muted)' }}
              >
                {m.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        className="w-full max-w-sm px-4 py-3 rounded-[8px] border border-[rgba(255,69,0,0.3)] text-[12px] font-mono"
        style={{ background: 'rgba(255,69,0,0.06)' }}
      >
        <span className="text-[var(--accent-glow)]">⚡ ALERT:</span>{' '}
        <span className="text-[var(--text-secondary)]">ep_01HX3K success rate trending below 99%. Auto-escalating to on-call.</span>
      </div>
    </div>
  )
}

// ─── Main HowItWorks ──────────────────────────────────────────────────────────
export function HowItWorks() {
  const wrapperRef   = useRef<HTMLDivElement>(null)
  const stickyRef    = useRef<HTMLDivElement>(null)
  const progressRef  = useRef<HTMLDivElement>(null)
  const [activePanel, setActivePanel] = useState(0)
  const [panelOpacity, setPanelOpacity] = useState([1, 0, 0, 0, 0])

  useEffect(() => {
    let gsap: typeof import('gsap').default
    let ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger
    let ctx: ReturnType<typeof gsap.context> | null = null
    let triggers: ReturnType<typeof ScrollTrigger.create>[] = []

    async function init() {
      const gsapModule = await import('gsap')
      const { ScrollTrigger: ST } = await import('gsap/ScrollTrigger')
      gsap = gsapModule.default
      ScrollTrigger = ST
      gsap.registerPlugin(ScrollTrigger)

      const wrapper = wrapperRef.current
      const sticky  = stickyRef.current
      if (!wrapper || !sticky) return

      ctx = gsap.context(() => {
        triggers.push(
          ScrollTrigger.create({
            trigger: wrapper,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
              if (progressRef.current) {
                progressRef.current.style.width = `${self.progress * 100}%`
              }
              const p = self.progress
              // 5 panels: 0–0.2, 0.2–0.4, 0.4–0.6, 0.6–0.8, 0.8–1.0
              const idx = Math.min(Math.floor(p * 5), 4)
              setActivePanel(idx)

              const newOp = [0, 0, 0, 0, 0]
              // Cross-fade within each segment
              const seg = p * 5
              const segIdx = Math.floor(seg)
              const segFrac = seg - segIdx
              if (segIdx < 4) {
                if (segFrac < 0.8) {
                  newOp[segIdx] = 1
                } else {
                  const t = (segFrac - 0.8) / 0.2
                  newOp[segIdx] = 1 - t
                  newOp[segIdx + 1] = t
                }
              } else {
                newOp[4] = 1
              }
              setPanelOpacity(newOp)
            },
          }),
        )
      })
    }

    init()

    return () => {
      triggers.forEach((t) => t.kill())
      ctx?.revert()
    }
  }, [])

  const panelComponents = [
    <TerminalPanel key={0} />,
    <QueuePanel key={1} />,
    <RetryPanel key={2} />,
    <DLQPanel key={3} />,
    <AIAlertsPanel key={4} />,
  ]

  return (
    <section
      ref={wrapperRef}
      className="relative"
      style={{ height: '500vh' }}  // 5 panels × 100vh
      id="how-it-works"
      aria-label="How Relay Works"
    >
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-30 h-[2px] bg-[var(--bg-border)]">
        <div
          ref={progressRef}
          className="h-full bg-[var(--accent-signal)] transition-none"
          style={{ width: '0%' }}
          aria-hidden
        />
      </div>

      {/* Sticky container */}
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen flex overflow-hidden bg-[var(--bg-base)]"
      >
        {/* Left column — 38.2% */}
        <div
          className="flex flex-col justify-center px-12 py-16 shrink-0"
          style={{ width: '38.2%' }}
        >
          <p className="text-[12px] tracking-widest uppercase text-[var(--text-muted)] mb-8 font-semibold">
            How it works
          </p>

          {/* Step counter */}
          <div
            className="font-display font-bold text-[var(--accent-signal)] mb-4 transition-all duration-500"
            style={{ fontSize: '68px', lineHeight: 1 }}
          >
            {PANELS[activePanel].step}
          </div>

          <h2
            className="font-display font-bold text-[var(--text-primary)] mb-4 transition-all duration-500"
            style={{ fontSize: '28px' }}
          >
            {PANELS[activePanel].title}
          </h2>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-10 transition-all duration-500">
            {PANELS[activePanel].description}
          </p>

          {/* Progress dots */}
          <div className="flex gap-3">
            {PANELS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === activePanel ? '24px' : '8px',
                  height: '8px',
                  background:
                    i === activePanel
                      ? 'var(--accent-signal)'
                      : 'var(--bg-border)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-[var(--bg-border)] shrink-0 my-16" />

        {/* Right column — 61.8% */}
        <div className="relative flex-1">
          {panelComponents.map((panel, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-500"
              style={{ opacity: panelOpacity[i] }}
              aria-hidden={i !== activePanel}
            >
              {panel}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
