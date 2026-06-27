'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  Link2,
  Activity,
  Key,
  CreditCard,
  LogOut,
  Zap,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/dashboard',           label: 'Overview',  icon: LayoutGrid },
  { href: '/dashboard/endpoints', label: 'Endpoints', icon: Link2 },
  { href: '/dashboard/events',    label: 'Events',    icon: Activity },
  { href: '/dashboard/keys',      label: 'API Keys',  icon: Key },
  { href: '/dashboard/billing',   label: 'Billing',   icon: CreditCard },
]

const PLAN_COLORS: Record<string, string> = {
  free:  'text-[var(--text-muted)] bg-[var(--bg-border)]',
  pro:   'text-[var(--accent-blue)] bg-[rgba(37,99,235,0.12)]',
  scale: 'text-[var(--accent-signal)] bg-[rgba(255,69,0,0.12)]',
}

interface SidebarProps {
  plan?: string
}

export function Sidebar({ plan = 'free' }: SidebarProps) {
  const pathname = usePathname()
  const { tenantName, logout } = useAuth()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-60 border-r border-[var(--bg-border)] bg-[var(--bg-surface)] z-20">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--bg-border)]">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-[18px] text-[var(--text-primary)]">
            <div className="w-7 h-7 rounded-[6px] bg-[var(--accent-signal)] flex items-center justify-center">
              <Zap size={14} fill="white" className="text-white" />
            </div>
            Relay
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1" aria-label="Dashboard navigation">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-all duration-150 relative group',
                  active
                    ? 'bg-[rgba(255,69,0,0.08)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                {/* Active indicator */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent-signal)]"
                    aria-hidden
                  />
                )}
                <Icon
                  size={17}
                  className={active ? 'text-[var(--accent-signal)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}
                />
                {label}
                {active && (
                  <ChevronRight size={13} className="ml-auto text-[var(--text-muted)]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Tenant + logout */}
        <div className="px-4 py-4 border-t border-[var(--bg-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[rgba(255,69,0,0.15)] flex items-center justify-center text-[var(--accent-signal)] font-bold text-[13px]">
              {(tenantName ?? 'T')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                {tenantName ?? 'My workspace'}
              </p>
              <span
                className={[
                  'inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] mt-0.5',
                  PLAN_COLORS[plan] ?? PLAN_COLORS.free,
                ].join(' ')}
              >
                {plan}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-[8px] text-[13px] text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[rgba(218,54,51,0.08)] transition-all"
            id="sidebar-logout"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-[var(--bg-surface)] border-t border-[var(--bg-border)] flex items-center"
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors',
                active
                  ? 'text-[var(--accent-signal)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
