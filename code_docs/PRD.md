# Relay — Product Requirements Document

## What It Is

Relay is a production-grade SaaS webhook delivery platform. Tenants register HTTP endpoints, send events via API, and Relay guarantees delivery — with retries, dead-lettering, signing, and rate limiting. Billing is handled via Razorpay subscriptions.

---

## Users

- **Tenant** — a company or developer subscribed to Relay. Has API keys, endpoints, and a subscription plan.
- **Relay (internal)** — the system itself; no admin UI required at this stage.

---

## Subscription Plans

| Plan  | Monthly Deliveries | Price         |
|-------|--------------------|---------------|
| Free  | 1,000              | ₹0            |
| Pro   | 50,000             | ₹999/mo       |
| Scale | Unlimited          | ₹4,999/mo     |

- Over-quota deliveries on Free/Pro → HTTP 402 returned to tenant, event dropped.
- Scale plan has no quota ceiling.
- Razorpay handles all billing. No custom billing engine.

---

## Core Features

### 1. Tenant Management
- Register tenant (name, email, password)
- Tenant gets one default API key on signup
- Generate / revoke API keys (multiple per tenant allowed)
- API key stored as `sha256(key)`, prefix shown in UI

### 2. Webhook Endpoints
- CRUD for outbound endpoints (URL, description, signing secret, active flag)
- Per-endpoint rate limit (requests/minute, default 60)
- Endpoint secret auto-generated on create (shown once), used for HMAC signing

### 3. Event Dispatch
- Tenant POSTs an event payload + target endpoint ID to Relay
- Relay enqueues a Celery task immediately (HTTP 202 returned)
- Celery worker makes the actual HTTP POST to the endpoint URL
- Request timeout: 30 seconds

### 4. Delivery Guarantees
- **Retry policy**: exponential backoff with full jitter
  - Attempt 1 → immediate
  - Attempt 2 → 30s ± jitter
  - Attempt 3 → 5m ± jitter
  - Attempt 4 → 30m ± jitter
  - Attempt 5 → 2h ± jitter
  - Attempt 6+ → dead letter
- **Dead Letter Queue**: Redis Streams (`relay:dlq`)
- DLQ processor runs as a Celery beat task every 5 minutes — marks events as `dead`, logs final state
- **Idempotency**: events carry a tenant-supplied `idempotency_key`; duplicate events within 24h are rejected (Redis TTL key)

### 5. HMAC Signing
- Every outbound request includes header: `X-Relay-Signature: sha256=<hmac>`
- HMAC computed as: `HMAC-SHA256(secret, timestamp + "." + raw_payload_json)`
- Also includes: `X-Relay-Timestamp`, `X-Relay-Event-ID`

### 6. Per-Endpoint Rate Limiting
- Redis sliding window counter per endpoint
- If rate exceeded: event re-queued with 60s delay (not counted as a retry attempt)

### 7. Delivery Logs
- Every attempt stored in `DeliveryAttempt` table
- Fields: attempt number, HTTP status code, response body (truncated to 4096 chars), duration_ms, error message, timestamp
- Tenant can query attempts per event

### 8. Razorpay Billing
- Tenant selects plan → Razorpay Checkout opens → subscription created
- Relay receives Razorpay webhook on:
  - `subscription.activated` → set tenant plan to active
  - `payment.captured` → log payment, reset monthly usage counter
  - `subscription.halted` → downgrade tenant to Free, freeze deliveries
  - `subscription.cancelled` → downgrade to Free
- Razorpay webhook endpoint is public but verified via Razorpay signature header
- All Razorpay API calls use idempotency keys

### 9. Usage Tracking
- `delivery_count` incremented per successful delivery
- Monthly reset via Celery beat (1st of each month, midnight IST)
- Tenant can query current usage via API

---

## What Is Out of Scope (v1)

- Admin UI / dashboard (API only)
- Email notifications on delivery failure
- Multiple signing algorithms (only HMAC-SHA256)
- Webhook event filtering / routing rules
- Custom retry schedules per endpoint

---

## Non-Functional Requirements

- All GET endpoints: cache-aside with Redis (TTL varies per resource)
- Heavy write/dispatch endpoints: Django async views
- PgBouncer in transaction pooling mode between app and Postgres
- All secrets (API keys, signing secrets) never stored plaintext — SHA-256 hashed
- Idempotency on all Razorpay API calls
- Delivery attempt log retained for 90 days (no automated purge in v1 — add index)
