import Link from 'next/link'
import { Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-[var(--bg-border)] bg-[var(--bg-base)] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-display font-bold text-[18px] text-[var(--text-primary)] mb-3">
              <div className="w-6 h-6 rounded-[5px] bg-[var(--accent-signal)] flex items-center justify-center">
                <Zap size={13} fill="white" className="text-white" />
              </div>
              Relay
            </Link>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              Webhook delivery infrastructure for modern teams.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
              Product
            </p>
            <ul className="flex flex-col gap-2">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'Docs', href: '/docs' },
                { label: 'Changelog', href: '/changelog' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
              Developers
            </p>
            <ul className="flex flex-col gap-2">
              {[
                { label: 'API Reference', href: '/docs/api' },
                { label: 'GitHub', href: 'https://github.com' },
                { label: 'Status', href: '/status' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
              Legal
            </p>
            <ul className="flex flex-col gap-2">
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--bg-border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[var(--text-muted)]">
            © {new Date().getFullYear()} Relay. All rights reserved.
          </p>
          <p className="text-[12px] text-[var(--text-muted)]">
            Built with ❤️ for developers
          </p>
        </div>
      </div>
    </footer>
  )
}
