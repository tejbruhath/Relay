'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ─── Bar animation types ──────────────────────────────────────────────────────
interface Bar {
  x: number
  baseHeight: number
  phase: number
  speed: number
}

const BAR_COUNT = 48
const MOUSE_RADIUS = 120

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef  = useRef({ x: -999, y: -999 })
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let bars: Bar[] = []
    let width  = 0
    let height = 0

    function initBars() {
      width  = canvas!.offsetWidth
      height = canvas!.offsetHeight
      canvas!.width  = width
      canvas!.height = height

      bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
        x: (i / (BAR_COUNT - 1)) * width,
        baseHeight: 0.15 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
      }))
    }

    function draw(time: number) {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, width, height)

      const t = time / 1000
      const { x: mx, y: my } = mouseRef.current

      for (const bar of bars) {
        const sinVal = Math.sin(t * bar.speed + bar.phase)
        const h = (bar.baseHeight + sinVal * 0.20) * height
        const x = bar.x
        const y = (height - h) / 2

        const dist = Math.hypot(x - mx, (height / 2) - my)

        let opacity: number
        if (dist < 60) {
          opacity = 0.8
        } else if (dist < MOUSE_RADIUS) {
          opacity = 0.15 + (1 - dist / MOUSE_RADIUS) * 0.65
        } else {
          opacity = 0.12
        }

        ctx.fillStyle = `rgba(255,69,0,${opacity})`
        ctx.beginPath()
        ctx.roundRect(x - 1, y, 2, h, 1)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    function onMouseLeave() {
      mouseRef.current = { x: -999, y: -999 }
    }

    function onResize() {
      initBars()
    }

    initBars()
    rafRef.current = requestAnimationFrame(draw)

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    canvas.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMouseMove)
      canvas?.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden
      />

      {/* Radial vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, var(--bg-base) 80%)',
        }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-16 text-left md:text-left">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 mb-6">
          <span
            className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase font-body"
            style={{
              background: 'rgba(255,69,0,0.12)',
              border: '1px solid rgba(255,69,0,0.25)',
              color: 'var(--accent-glow)',
            }}
          >
            WEBHOOK INFRASTRUCTURE
          </span>
        </div>

        {/* Headline — F-pattern: key stat in first line */}
        <h1
          className="font-display font-bold leading-[1.05] mb-6"
          style={{ fontSize: 'clamp(42px, 7vw, 68px)' }}
        >
          Deliver every signal.{' '}
          <span className="gradient-text">Miss nothing.</span>
        </h1>

        {/* Subtext */}
        <p
          className="text-[var(--text-secondary)] mb-10 max-w-2xl leading-relaxed"
          style={{ fontSize: 'clamp(16px, 2vw, 20px)' }}
        >
          Relay handles outbound webhook delivery with retries, dead-lettering,
          and HMAC signing — so you don&apos;t have to.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Link href="/register">
            <Button variant="primary" size="lg" fullWidth className="sm:w-auto signal-glow">
              Start for free
              <ArrowRight size={18} />
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="ghost" size="lg" fullWidth className="sm:w-auto">
              <BookOpen size={18} />
              Read the docs
            </Button>
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-[13px] text-[var(--text-muted)]">
          Free tier: 1,000 deliveries/month. No credit card.
        </p>

        {/* Stats row */}
        <div
          className="mt-16 grid grid-cols-3 gap-8 max-w-lg border border-[var(--bg-border)] rounded-[12px] p-6"
          style={{ background: 'rgba(13,17,23,0.6)', backdropFilter: 'blur(8px)' }}
        >
          {[
            { value: '99.9%', label: 'Delivery rate' },
            { value: '6x', label: 'Retry attempts' },
            { value: '<200ms', label: 'Median latency' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="font-display font-bold text-[24px] text-[var(--text-primary)]">
                {value}
              </div>
              <div className="text-[12px] text-[var(--text-muted)] mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-base))' }}
        aria-hidden
      />
    </section>
  )
}
