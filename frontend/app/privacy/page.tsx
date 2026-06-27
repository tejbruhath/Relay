import Link from 'next/link'
import { Zap } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Relay',
  description: 'Privacy Policy for the Relay webhook delivery platform. Last updated June 2026.',
}

export default function PrivacyPage() {
  const lastUpdated = 'June 27, 2026'

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--bg-border)] bg-[var(--bg-base)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-[18px]">
            <div className="w-7 h-7 rounded-[6px] bg-[var(--accent-signal)] flex items-center justify-center">
              <Zap size={14} fill="white" className="text-white" />
            </div>
            Relay
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-24 pb-24">
        <h1 className="font-display font-bold text-[42px] text-[var(--text-primary)] mb-2">
          Privacy Policy
        </h1>
        <p className="text-[var(--text-muted)] mb-12 text-[14px]">
          Last updated: {lastUpdated}
        </p>

        <div className="flex flex-col gap-10 text-[var(--text-secondary)] leading-relaxed" style={{ fontSize: '15px' }}>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              1. Who We Are
            </h2>
            <p>
              Relay (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is a webhook delivery infrastructure platform operated as an independent software product. We provide APIs and tooling for developers and businesses to reliably deliver webhook events to their consumers.
            </p>
            <p className="mt-3">
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use Relay&apos;s services, website, or API. Please read this carefully. If you disagree with its terms, please discontinue use of the service.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              2. Information We Collect
            </h2>
            <p className="font-semibold text-[var(--text-primary)] mb-2">2.1 Account Information</p>
            <p>When you register for a Relay account, we collect your name, email address, and a hashed version of your password (using Argon2 — we never store your raw password). Your organization name is stored for billing and identification purposes.</p>

            <p className="font-semibold text-[var(--text-primary)] mb-2 mt-4">2.2 API Usage Data</p>
            <p>We log all API requests including endpoint URLs called, timestamps, HTTP status codes, request payloads dispatched through our service, and delivery attempt metadata. This data is essential for the delivery guarantee and audit trail features of the platform.</p>

            <p className="font-semibold text-[var(--text-primary)] mb-2 mt-4">2.3 Webhook Payload Data</p>
            <p>When you dispatch events through Relay, we temporarily store the event payload in order to perform delivery attempts and retain delivery logs. Payload data is stored encrypted at rest. Retention periods: 7 days (Free), 30 days (Pro), 90 days (Scale).</p>

            <p className="font-semibold text-[var(--text-primary)] mb-2 mt-4">2.4 Payment Information</p>
            <p>Billing is handled through Razorpay. We do not store raw card numbers or sensitive payment credentials. We receive and store subscription status, plan identifiers, and payment confirmation records from Razorpay&apos;s webhook callbacks.</p>

            <p className="font-semibold text-[var(--text-primary)] mb-2 mt-4">2.5 Technical Data</p>
            <p>We may collect your IP address, browser type, and access timestamps for security monitoring, abuse prevention, and service diagnostics. This data is not sold or shared with advertising networks.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>To provide, operate, and maintain the Relay webhook delivery service</li>
              <li>To authenticate your API requests and manage your account</li>
              <li>To enforce delivery guarantees, retry policies, and Dead Letter Queue retention</li>
              <li>To process billing and subscription management via Razorpay</li>
              <li>To detect and prevent fraud, abuse, and unauthorized API access</li>
              <li>To send transactional emails (account confirmation, billing receipts, delivery failure alerts)</li>
              <li>To improve the service through aggregate, anonymized usage analytics</li>
              <li>To comply with applicable laws, court orders, or regulatory requirements</li>
            </ul>
            <p className="mt-4">We do <strong className="text-[var(--text-primary)]">not</strong> sell your personal data or webhook payload data to third parties. We do not use your payload data to train machine learning models.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              4. Data Sharing &amp; Disclosure
            </h2>
            <p className="mb-3">We share your information only in the following limited circumstances:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li><strong className="text-[var(--text-primary)]">Service providers:</strong> Infrastructure providers (cloud hosting, databases) who process data under strict confidentiality agreements</li>
              <li><strong className="text-[var(--text-primary)]">Payment processing:</strong> Razorpay processes your payment information under their own privacy policy</li>
              <li><strong className="text-[var(--text-primary)]">Legal requirements:</strong> If required by law, subpoena, or to protect the rights, property, or safety of Relay, our users, or the public</li>
              <li><strong className="text-[var(--text-primary)]">Business transfers:</strong> In the event of a merger, acquisition, or sale, your data may be transferred with appropriate notice</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              5. Data Security
            </h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="list-disc ml-6 space-y-2 mt-3">
              <li>Argon2 password hashing — your password is never stored in recoverable form</li>
              <li>SHA-256 hashing of API keys — we cannot recover your raw key</li>
              <li>HMAC-SHA256 signing of all webhook deliveries</li>
              <li>TLS encryption in transit for all API communication</li>
              <li>Encryption at rest for all stored payload data</li>
              <li>Segmented Redis databases for cache, Celery, idempotency, and rate limiting</li>
            </ul>
            <p className="mt-4">No system is 100% secure. If you discover a security vulnerability, please contact us at security@relay.dev before public disclosure.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              6. Data Retention
            </h2>
            <p>We retain your account data for as long as your account is active. Upon account deletion, we delete personal data within 30 days, except where retention is required by law or for fraud investigation.</p>
            <p className="mt-3">Webhook payload data is retained per your plan&apos;s log retention period (see Pricing). Delivery logs are anonymized after the retention period rather than hard-deleted, to preserve aggregate analytics.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              7. Your Rights
            </h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc ml-6 space-y-2 mt-3">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
              <li>Object to processing or request restriction</li>
              <li>Data portability (export your account data)</li>
              <li>Withdraw consent where processing is consent-based</li>
            </ul>
            <p className="mt-4">To exercise any of these rights, contact us at privacy@relay.dev. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              8. Cookies &amp; Tracking
            </h2>
            <p>The Relay dashboard uses only essential cookies required for session management. We do not use third-party advertising cookies or tracking pixels. We do not use Google Analytics or similar services on authenticated dashboard pages.</p>
            <p className="mt-3">The public marketing website may use minimal analytics to understand page traffic in aggregate. No personally identifiable information is collected for marketing analytics purposes.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              9. Children&apos;s Privacy
            </h2>
            <p>Relay is a developer-focused B2B platform. We do not knowingly collect personal information from individuals under the age of 18. If you believe a minor has registered for an account, contact us at privacy@relay.dev and we will delete the account promptly.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              10. Changes to This Policy
            </h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email and will post the updated policy on this page with a new &ldquo;Last updated&rdquo; date. Continued use of the service after the effective date constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-[20px] text-[var(--text-primary)] mb-4">
              11. Contact Us
            </h2>
            <p>For privacy-related questions, data access requests, or to report a concern:</p>
            <div className="mt-4 p-4 rounded-[8px] border border-[var(--bg-border)] bg-[var(--bg-surface)] font-mono text-[13px] text-[var(--text-secondary)] space-y-1">
              <div>Email: <span className="text-[var(--accent-signal)]">privacy@relay.dev</span></div>
              <div>Security: <span className="text-[var(--accent-signal)]">security@relay.dev</span></div>
            </div>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-[var(--bg-border)] flex gap-6 text-[13px] text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--accent-signal)] transition-colors">Home</Link>
          <Link href="/docs" className="hover:text-[var(--accent-signal)] transition-colors">Documentation</Link>
          <Link href="/register" className="hover:text-[var(--accent-signal)] transition-colors">Get started</Link>
        </div>
      </div>
    </div>
  )
}
