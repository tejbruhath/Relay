'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
        scrolled
          ? 'bg-[rgba(7,9,15,0.85)] backdrop-blur-md border-b border-[var(--bg-border)]'
          : 'bg-transparent',
      ].join(' ')}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-bold text-[20px] text-[var(--text-primary)]"
        >
          <div className="w-7 h-7 rounded-[6px] bg-[var(--accent-signal)] flex items-center justify-center">
            <Zap size={15} fill="white" className="text-white" />
          </div>
          Relay
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/docs"
            className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Docs
          </Link>
          <Link
            href="#pricing"
            className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            GitHub
          </Link>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">
              Get started free
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-[var(--text-primary)] p-1"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[var(--bg-surface)] border-b border-[var(--bg-border)] px-6 py-4 flex flex-col gap-4">
          <Link
            href="/docs"
            className="text-[15px] text-[var(--text-secondary)] py-2"
            onClick={() => setMenuOpen(false)}
          >
            Docs
          </Link>
          <Link
            href="#pricing"
            className="text-[15px] text-[var(--text-secondary)] py-2"
            onClick={() => setMenuOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] text-[var(--text-secondary)] py-2"
            onClick={() => setMenuOpen(false)}
          >
            GitHub
          </Link>
          <div className="flex flex-col gap-3 pt-2 border-t border-[var(--bg-border)]">
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" fullWidth>Sign in</Button>
            </Link>
            <Link href="/register" onClick={() => setMenuOpen(false)}>
              <Button variant="primary" fullWidth>Get started free</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
