'use client'

import { useEffect, useRef, useState } from 'react'

// ─── Panel content ────────────────────────────────────────────────────────────
const PANELS = [
  {
    step: '01',
    title: 'You fire an event',
    description:
      'POST a JSON payload to the Relay API with your event type and target endpoint. Relay acknowledges immediately.',
  },
  {
    step: '02',
    title: 'Relay queues and signs it',
    description:
      'Your event enters a durable queue. Relay computes an HMAC-SHA256 signature and attaches it to every delivery attempt.',
  },
  {
    step: '03',
    title: 'Your customer receives it',
    description:
      'Relay POSTs to your customer's endpoint with exponential backoff on failure. Every attempt is logged with status code, latency, and body.',
  },
]

// ─── Animated Terminal (Panel 1) ──────────────────────────────────────────────
const TERMINAL_LINES = [
  'curl -X POST https://api.relay.dev/v1/events \\',
  '  -H "X-Relay-Key: rk_live_••••••••" \\',
  '  -H "Content-Type: application/json" \\',
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
      if (i >= TERMINAL_LINES.length) clearInterval(id)
    }, 180)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-lg rounded-[12px] border border-[var(--bg-border)] overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-[var(--bg-border)]">
          <span className="w-3 h-3 rounded-full bg-[#da3633]" />
          <span className="w-3 h-3 rounded-full bg-[#d29922]" />
          <span className="w-3 h-3 rounded-full bg-[#2ea043]" />
          <span className="ml-2 text-[12px] text-[var(--text-muted)]">terminal</span>
        </div>
        {/* Body */}
        <div className="p-4 bg-[#0d1117] font-mono text-[13px] leading-relaxed min-h-[220px]">
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
              → 200 OK · event_id: evt_01HX3K9M...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Queue Panel (Panel 2) ────────────────────────────────────────────────────
function QueuePanel() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-8">
      {/* Queue visualization */}
      <div className="flex items-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-12 h-12 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-surface)] flex items-center justify-center"
            style={{
              opacity: 1 - i * 0.2,
              transform: `scale(${1 - i * 0.05})`,
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
        Every payload is signed before delivery. Your endpoints verify the signature — not just trust.
      </p>
    </div>
  )
}

// ─── HTTP Success Panel (Panel 3) ─────────────────────────────────────────────
function HttpPanel() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
      {/* Success pulse */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute w-24 h-24 rounded-full bg-[rgba(46,160,67,0.15)]"
          style={{ animation: 'pulseGlow 2s ease-in-out infinite' }}
        />
        <div className="relative w-16 h-16 rounded-full bg-[rgba(46,160,67,0.2)] border-2 border-[var(--success)] flex items-center justify-center"
          style={{ animation: 'checkIn 600ms cubic-bezier(0.34,1.56,0.64,1) forwards' }}
        >
          <span className="text-[28px]">✓</span>
        </div>
      </div>

      {/* HTTP response card */}
      <div className="w-full max-w-sm rounded-[10px] border border-[var(--bg-border)] overflow-hidden font-mono text-[13px]">
        <div className="bg-[#161b22] px-4 py-2 border-b border-[var(--bg-border)]">
          <span className="text-[var(--success)]">POST</span>
          <span className="text-[var(--text-muted)] ml-2">
            https://your-app.com/webhooks
          </span>
        </div>
        <div className="bg-[#0d1117] p-4 space-y-1">
          <div>
            <span className="text-[var(--success)]">HTTP/1.1 200 OK</span>
          </div>
          <div className="text-[var(--text-muted)]">
            X-Relay-Attempt: 1/6
          </div>
          <div className="text-[var(--text-muted)]">
            X-Relay-Event: invoice.paid
          </div>
          <div className="text-[var(--text-muted)]">
            Latency: 142ms
          </div>
          <div className="mt-2 text-[var(--text-secondary)]">
            {`{ "received": true }`}
          </div>
        </div>
      </div>

      <p className="text-[13px] text-[var(--text-muted)] text-center max-w-xs">
        Delivered. Logged. If it had failed, Relay would retry — up to 6 times with exponential backoff.
      </p>
    </div>
  )
}

// ─── Main HowItWorks ──────────────────────────────────────────────────────────
export function HowItWorks() {
  const wrapperRef   = useRef<HTMLDivElement>(null)
  const stickyRef    = useRef<HTMLDivElement>(null)
  const progressRef  = useRef<HTMLDivElement>(null)
  const [activePanel, setActivePanel] = useState(0)
  const [panelOpacity, setPanelOpacity] = useState([1, 0, 0])

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
        // Scroll progress bar
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
              const idx = p < 0.4 ? 0 : p < 0.73 ? 1 : 2
              setActivePanel(idx)
              if (p < 0.33) {
                setPanelOpacity([1, 0, 0])
              } else if (p < 0.5) {
                const t = (p - 0.33) / 0.17
                setPanelOpacity([1 - t, t, 0])
              } else if (p < 0.66) {
                setPanelOpacity([0, 1, 0])
              } else if (p < 0.83) {
                const t = (p - 0.66) / 0.17
                setPanelOpacity([0, 1 - t, t])
              } else {
                setPanelOpacity([0, 0, 1])
              }
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

  const panelComponents = [<TerminalPanel key={0} />, <QueuePanel key={1} />, <HttpPanel key={2} />]

  return (
    <section
      ref={wrapperRef}
      className="relative"
      style={{ height: '300vh' }}
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
