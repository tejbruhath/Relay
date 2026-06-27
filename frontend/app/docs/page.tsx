import Link from 'next/link'
import { Zap, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation — Relay',
  description: 'Complete API reference and integration guides for the Relay webhook delivery platform.',
}

const sections = [
  {
    id: 'quickstart',
    title: 'Quickstart',
    content: `Get your first webhook delivered in under 5 minutes.

**1. Register a tenant**

\`\`\`bash
curl -X POST https://api.relay.dev/v1/auth/register/ \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Acme Corp","email":"you@acme.com","password":"SecurePass1!","confirm_password":"SecurePass1!"}'
\`\`\`

The response includes your \`api_key\`. Save it — it will not be shown again.

**2. Create an endpoint**

\`\`\`bash
curl -X POST https://api.relay.dev/v1/endpoints/ \\
  -H "X-Relay-Key: rly_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://your-app.com/webhooks","description":"Production"}'
\`\`\`

**3. Dispatch an event**

\`\`\`bash
curl -X POST https://api.relay.dev/v1/events/ \\
  -H "X-Relay-Key: rly_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"endpoint_id":"ep_xxx","event_type":"invoice.paid","payload":{"amount":4999},"idempotency_key":"inv-001"}'
\`\`\`

Relay returns \`202 Accepted\` immediately. Delivery happens asynchronously.`,
  },
  {
    id: 'authentication',
    title: 'Authentication',
    content: `All API requests require an \`X-Relay-Key\` header containing your API key.

\`\`\`
X-Relay-Key: rly_live_••••••••••••••••
\`\`\`

API keys are hashed with SHA-256 before storage. We never store the raw key. If you lose your key, revoke it and create a new one.

**Key rotation:** \`DELETE /api/v1/api-keys/{id}/\` to revoke. \`POST /api/v1/api-keys/\` to create a new one. Multiple keys can be active simultaneously — rotate without downtime.`,
  },
  {
    id: 'signature-verification',
    title: 'Signature Verification',
    content: `Every delivery includes an \`X-Relay-Signature\` header. Verify it to ensure the request originated from Relay and has not been tampered with.

**Header format:**
\`\`\`
X-Relay-Signature: sha256=<hmac_hex>
X-Relay-Timestamp: 1719500000
\`\`\`

**Verification algorithm (Python):**
\`\`\`python
import hmac, hashlib

def verify_signature(raw_secret: str, timestamp: int, body: str, signature: str) -> bool:
    message = f"{timestamp}.{body}"
    expected = "sha256=" + hmac.new(
        raw_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
\`\`\`

**Note:** Always use \`hmac.compare_digest\` to prevent timing attacks. Reject requests where \`|timestamp - now| > 300\` seconds.`,
  },
  {
    id: 'retry-policy',
    title: 'Retry Policy',
    content: `Relay uses exponential backoff with full jitter for retry scheduling.

| Attempt | Delay (approx.) | Max Delay |
|---------|----------------|-----------|
| 1 → 2   | 0–30s          | 30s       |
| 2 → 3   | 0–60s          | 60s       |
| 3 → 4   | 0–240s         | 4min      |
| 4 → 5   | 0–960s         | 16min     |
| 5 → 6   | 0–3840s        | 64min     |

After 6 failed attempts, the event is moved to the Dead Letter Queue with \`status: dead\`.

**Success criteria:** Any 2xx HTTP status code from your endpoint.

**Failure criteria:** 4xx, 5xx, timeout (>30s), or connection error.`,
  },
  {
    id: 'idempotency',
    title: 'Idempotency',
    content: `Relay enforces idempotency at ingestion. Duplicate events with the same \`idempotency_key\` within a 24-hour window return \`409 Conflict\` — the original event is not re-dispatched.

**Best practice:** Use a deterministic key derived from the source event:

\`\`\`
idempotency_key = f"{invoice_id}-{event_type}-{attempt_number}"
\`\`\`

**Scope:** Idempotency keys are scoped per tenant. Different tenants can use the same key without conflict.`,
  },
  {
    id: 'rate-limits',
    title: 'Rate Limits',
    content: `Rate limits are enforced per endpoint using a 1-minute sliding window.

**Default:** 60 deliveries/minute per endpoint (configurable via \`rate_limit_per_minute\` on the endpoint).

When the rate limit is exceeded, Relay requeues the event with a 60-second delay — no event is dropped. The delivery attempt counter is not incremented for rate-limited retries.

**API rate limits:** 1,000 API requests/minute per tenant (not configurable on Free tier).`,
  },
  {
    id: 'dead-letter-queue',
    title: 'Dead Letter Queue',
    content: `Events that exhaust all 6 retry attempts are moved to the Dead Letter Queue.

**Query DLQ events:**
\`\`\`bash
curl https://api.relay.dev/v1/events/?status=dead \\
  -H "X-Relay-Key: rly_live_••••"
\`\`\`

**Replay a dead event** (re-dispatches with a new event ID and fresh retry count):
\`\`\`bash
# Coming soon in v1.1 — use the dashboard for now
\`\`\`

DLQ events are retained for 90 days on Scale plan, 30 days on Pro, and 7 days on Free.`,
  },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--bg-border)] bg-[var(--bg-base)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-[18px]">
            <div className="w-7 h-7 rounded-[6px] bg-[var(--accent-signal)] flex items-center justify-center">
              <Zap size={14} fill="white" className="text-white" />
            </div>
            Relay
          </Link>
          <Link href="/register" className="flex items-center gap-1.5 text-[14px] text-[var(--accent-signal)] hover:underline">
            Get started free <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-24 flex gap-12">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">
              Contents
            </p>
            <nav className="flex flex-col gap-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--accent-signal)] transition-colors py-1"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-[42px] text-[var(--text-primary)] mb-2">
            Documentation
          </h1>
          <p className="text-[var(--text-secondary)] mb-12 text-[18px]">
            Everything you need to integrate Relay into your stack.
          </p>

          <div className="flex flex-col gap-16">
            {sections.map((s) => (
              <section key={s.id} id={s.id}>
                <h2 className="font-display font-bold text-[26px] text-[var(--text-primary)] mb-6 pb-4 border-b border-[var(--bg-border)]">
                  {s.title}
                </h2>
                <div
                  className="prose prose-invert max-w-none text-[var(--text-secondary)] leading-relaxed"
                  style={{ fontSize: '15px' }}
                >
                  {s.content.split('\n\n').map((block, i) => {
                    if (block.startsWith('```')) {
                      const lines = block.split('\n')
                      const lang = lines[0].replace('```', '')
                      const code = lines.slice(1, -1).join('\n')
                      return (
                        <pre key={i} className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-[8px] p-4 overflow-x-auto my-4 font-mono text-[13px] text-[var(--text-primary)]">
                          <code>{code}</code>
                        </pre>
                      )
                    }
                    if (block.startsWith('|')) {
                      const rows = block.split('\n').filter(r => !r.match(/^[|\s-]+$/))
                      return (
                        <div key={i} className="overflow-x-auto my-4">
                          <table className="w-full text-[14px]">
                            <tbody>
                              {rows.map((row, ri) => (
                                <tr key={ri} className={ri === 0 ? 'border-b border-[var(--bg-border)] font-semibold text-[var(--text-primary)]' : 'border-b border-[var(--bg-border)]'}>
                                  {row.split('|').filter(Boolean).map((cell, ci) => (
                                    <td key={ci} className="py-2 pr-4">{cell.trim()}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    }
                    const withBold = block.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--text-primary)]">$1</strong>')
                    const withCode = withBold.replace(/`([^`]+)`/g, '<code class="font-mono text-[13px] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded text-[var(--accent-glow)]">$1</code>')
                    if (block.startsWith('**')) {
                      return <p key={i} className="my-3" dangerouslySetInnerHTML={{ __html: withCode }} />
                    }
                    return <p key={i} className="my-3" dangerouslySetInnerHTML={{ __html: withCode }} />
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
