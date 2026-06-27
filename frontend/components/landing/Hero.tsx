'use client'

import { useEffect, useRef, useState } from 'react'
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
const MOUSE_RADIUS = 320

function TerminalHero() {
  const [lines, setLines] = useState<any[]>([])

  useEffect(() => {
    let mounted = true
    let timeoutIds: NodeJS.Timeout[] = []
    let intervalId: NodeJS.Timeout | null = null

    const clearTimers = () => {
      if (intervalId) clearInterval(intervalId)
      timeoutIds.forEach((id) => clearTimeout(id))
      timeoutIds = []
    }

    const runSequence = () => {
      if (!mounted) return
      clearTimers()
      setLines([])

      let currentLines: any[] = []
      const pushLine = (line: any) => {
        currentLines = [...currentLines, line]
        setLines(currentLines)
      }
      const updateLastLine = (text: string) => {
        currentLines = [...currentLines]
        currentLines[currentLines.length - 1] = {
          ...currentLines[currentLines.length - 1],
          text,
        }
        setLines(currentLines)
      }
      const removeCursor = () => {
        if (currentLines.length > 0) {
          currentLines[currentLines.length - 1].showCursor = false
        }
      }

      // Line 1
      pushLine({
        text: '$ curl api.relay.sh/v1/events \\',
        color: 'var(--text-secondary)',
        showCursor: true,
      })

      const typeLine = (fullText: string, color: string, onComplete: () => void) => {
        removeCursor()
        pushLine({ text: '', color, showCursor: true })

        let charIndex = 0
        intervalId = setInterval(() => {
          if (!mounted) return
          charIndex++
          updateLastLine(fullText.slice(0, charIndex))
          if (charIndex >= fullText.length) {
            clearInterval(intervalId!)
            intervalId = null
            onComplete()
          }
        }, 30)
      }

      const step2 = () =>
        typeLine('  -H "X-Relay-Key: rly_live_••••••••" \\', 'var(--text-secondary)', step3)
      
      const step3 = () =>
        typeLine('  -d \'{"event_type": "payment.captured"}\'', 'var(--text-secondary)', step4)

      const step4 = () => {
        timeoutIds.push(
          setTimeout(() => {
            if (!mounted) return
            removeCursor()
            pushLine({ text: '', color: 'transparent' }) // Line 4 blank

            timeoutIds.push(
              setTimeout(() => {
                if (!mounted) return
                pushLine({
                  text: 'queued          event_id: evt_01J...',
                  color: '#F0F6FC',
                  prefix: '●',
                  dotColor: '#2EA043',
                })

                timeoutIds.push(
                  setTimeout(() => {
                    if (!mounted) return
                    pushLine({
                      text: 'signing         HMAC-SHA256 computed',
                      color: '#F0F6FC',
                      prefix: '●',
                      dotColor: 'var(--accent-signal)',
                    })

                    timeoutIds.push(
                      setTimeout(() => {
                        if (!mounted) return
                        pushLine({
                          text: 'dispatching     POST → merchant.acme.com',
                          color: '#F0F6FC',
                          prefix: '●',
                          dotColor: '#2563EB',
                        })

                        timeoutIds.push(
                          setTimeout(() => {
                            if (!mounted) return
                            pushLine({
                              text: 'delivered       ',
                              suffix: '200 OK · 47ms',
                              color: '#2EA043',
                              prefix: '✓',
                              dotColor: '#2EA043',
                            })

                            timeoutIds.push(
                              setTimeout(() => {
                                if (!mounted) return
                                runSequence()
                              }, 2000)
                            )
                          }, 800)
                        )
                      }, 500)
                    )
                  }, 600)
                )
              }, 400)
            )
          }, 200)
        )
      }

      timeoutIds.push(setTimeout(() => step2(), 400))
    }

    runSequence()

    return () => {
      mounted = false
      clearTimers()
    }
  }, [])

  const renderText = (text: string) => {
    const parts = text.split(/(rly_live_[•]*)/)
    return parts.map((part: string, idx: number) => {
      if (part.startsWith('rly_live_')) {
        return (
          <span key={idx} style={{ color: 'var(--accent-signal)' }}>
            {part}
          </span>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  return (
    <div className="w-full max-w-[520px] rounded-[12px] border border-[var(--bg-border)] bg-[#0D1117] p-6 text-[13px] font-mono leading-[1.6]">
      {/* Top bar */}
      <div className="flex gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
      </div>

      {/* Content */}
      <div className="flex flex-col min-h-[220px]">
        {lines.map((l, i) => (
          <div key={i} className="flex">
            {l.prefix && (
              <span className="mr-3 select-none" style={{ color: l.dotColor }}>
                {l.prefix}
              </span>
            )}

            <span style={{ color: l.color }} className="whitespace-pre flex-1">
              {renderText(l.text)}
              {l.suffix && <span className="ml-2 text-[#8B949E]">{l.suffix}</span>}
              {l.showCursor && (
                <span
                  className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-[var(--text-secondary)]"
                  style={{ animation: 'typeCursor 1s step-end infinite' }}
                />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -999, y: -999 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let bars: Bar[] = []
    let width = 0
    let height = 0

    function initBars() {
      width = canvas!.offsetWidth
      height = canvas!.offsetHeight
      canvas!.width = width
      canvas!.height = height

      bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
        x: (i / (BAR_COUNT - 1)) * width,
        baseHeight: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.25,
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

        const dist = Math.hypot(x - mx, height / 2 - my)

        let opacity: number
        if (dist < MOUSE_RADIUS * 0.15) {
          opacity = 0.75
        } else if (dist < MOUSE_RADIUS) {
          const t2 = 1 - dist / MOUSE_RADIUS
          opacity = 0.50 + t2 * 0.25
        } else {
          opacity = 0.50
        }

        ctx.fillStyle = `rgba(255,69,0,${opacity})`
        ctx.beginPath()
        ctx.roundRect(x - 2, y, 4, h, 2)
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

      {/* Radial vignette overlay — softer so bars show through */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 0%, var(--bg-base) 85%)',
        }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-[96px] pt-24 pb-16 flex flex-col md:flex-row items-center justify-between gap-[64px]">
        {/* Left Column — Copy */}
        <div className="w-full md:w-[45%] flex flex-col text-left">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-6">
            <span
              className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase font-body w-fit"
              style={{
                background: 'rgba(255,69,0,0.12)',
                border: '1px solid rgba(255,69,0,0.25)',
                color: 'var(--accent-glow)',
              }}
            >
              WEBHOOK INFRASTRUCTURE
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-display font-bold text-white mb-6"
            style={{ fontSize: '68px', lineHeight: 1.05 }}
          >
            Stop losing<br />webhooks.
          </h1>

          {/* Subtext */}
          <p
            className="text-[var(--text-secondary)] font-body text-[18px] mb-10 max-w-[420px] leading-relaxed"
          >
            Relay queues, signs, and delivers your webhooks — with retries, dead-lettering,
            and full delivery logs. You fire and forget.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
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

          {/* Social proof / Free tier note */}
          <p className="text-[12px] text-[var(--text-muted)]">
            Free tier: 1,000 deliveries/month. No credit card.
          </p>
        </div>

        {/* Right Column — Terminal Animation */}
        <div className="w-full md:w-[55%] flex justify-center md:justify-end">
          <TerminalHero />
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
