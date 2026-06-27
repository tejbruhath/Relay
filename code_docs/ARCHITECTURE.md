# Relay — Architecture

## System Overview

```
Tenant API Client
      │
      ▼
 [Django DRF API]  ──── PgBouncer ──── PostgreSQL
      │    │
      │    └──── Redis (cache + rate limit + idempotency)
      │
      ▼
 [Celery Worker]  ──── Redis Streams (DLQ)
      │
      ▼
 [Tenant Endpoint HTTP POST]

 [Celery Beat] ──── DLQ Processor + Monthly Reset

 [Razorpay] ──── POST /billing/webhook/ ──── Django
```

---

## Components

### Django DRF API
- Handles all tenant-facing API calls
- Fat serializers: all business logic (validation, quota checks, cache writes) lives in serializers
- Skinny views: views call `serializer.is_valid(raise_exception=True)` → `serializer.save()` → return response
- Async views on: `POST /events/`, `GET /events/{id}/attempts/`, `POST /billing/webhook/`
- Sync views on: all CRUD (endpoints, API keys, tenant profile, usage)

### Celery Workers
- Queue: `relay.dispatch` — webhook dispatch tasks
- Queue: `relay.billing` — Razorpay event processing
- Queue: `relay.maintenance` — DLQ processing, usage reset
- Concurrency: 4 workers per queue (configurable via env)
- Task acks on start (not on success) — prevents lost tasks on worker crash

### Redis
- **Cache**: `relay:cache:{resource}:{id}` — cache-aside, TTL per resource type
- **Rate limit**: `relay:ratelimit:{endpoint_id}:{window}` — sliding window
- **Idempotency**: `relay:idem:{tenant_id}:{idempotency_key}` — TTL 24h
- **DLQ**: Redis Streams `relay:dlq` — dead letter events
- **Celery broker**: default Redis DB 1

### PostgreSQL + PgBouncer
- PgBouncer in **transaction pooling** mode
- Pool size: 20 server connections, max 100 client connections
- Django connects to PgBouncer (port 6432), not Postgres directly
- Django's `CONN_MAX_AGE = 0` when using PgBouncer transaction mode (required)

---

## Data Flow: Event Dispatch

```
1. POST /api/v1/events/
   ├── Authenticate via API key header (X-Relay-Key)
   ├── Deserialize + validate payload (EventDispatchSerializer)
   ├── Check idempotency_key in Redis → 409 if duplicate
   ├── Check tenant quota → 402 if exceeded
   ├── Write WebhookEvent to PostgreSQL (status=pending)
   ├── Enqueue dispatch_webhook.delay(event_id)
   ├── Store idempotency_key in Redis (TTL 24h)
   └── Return HTTP 202 {event_id}

2. Celery: dispatch_webhook(event_id)
   ├── Fetch WebhookEvent + WebhookEndpoint + Tenant
   ├── Check endpoint rate limit (Redis sliding window)
   │   └── If exceeded: re-queue with 60s ETA, return
   ├── Build HMAC signature
   ├── HTTP POST to endpoint URL (timeout=30s)
   ├── On 2xx:
   │   ├── Create DeliveryAttempt (status_code, duration_ms)
   │   ├── Update WebhookEvent.status = delivered
   │   └── Increment tenant delivery_count
   └── On non-2xx or timeout:
       ├── Create DeliveryAttempt (error logged)
       ├── If attempt < 6: requeue with backoff delay
       └── If attempt >= 6: push to Redis Streams DLQ

3. Celery Beat: process_dlq() every 5min
   ├── XREAD relay:dlq (batch 100)
   ├── For each: update WebhookEvent.status = dead
   └── XACK messages
```

---

## Data Flow: Razorpay Billing

```
1. Tenant calls POST /api/v1/billing/create-subscription/ {plan}
   ├── Call Razorpay API: create subscription (idempotency key = tenant_id + plan)
   ├── Store razorpay_subscription_id on Tenant
   └── Return {subscription_id, razorpay_key_id} for frontend Checkout

2. Razorpay POST /api/v1/billing/webhook/
   ├── Verify X-Razorpay-Signature header (HMAC-SHA256)
   ├── Route by event type:
   │   ├── subscription.activated → set Subscription.status=active, set plan
   │   ├── payment.captured      → create PaymentRecord, reset usage if new period
   │   ├── subscription.halted   → set status=halted, downgrade to Free
   │   └── subscription.cancelled → set status=cancelled, downgrade to Free
   └── Return HTTP 200 (always — Razorpay retries on non-200)
```

---

## Cache TTLs

| Resource            | Cache Key Pattern                        | TTL   |
|---------------------|------------------------------------------|-------|
| WebhookEndpoint     | `relay:cache:endpoint:{id}`              | 5 min |
| Tenant profile      | `relay:cache:tenant:{id}`                | 10 min|
| Delivery attempts   | `relay:cache:attempts:{event_id}`        | 2 min |
| Usage summary       | `relay:cache:usage:{tenant_id}`          | 1 min |
| Subscription status | `relay:cache:subscription:{tenant_id}`   | 5 min |

Cache invalidated on any write to the underlying resource.

---

## Security

- API keys: `rly_live_{random_32_bytes_hex}` format, stored as `sha256(key)`, prefix `rly_live_XXXXXXXX` stored for display
- Signing secrets: `whsec_{random_32_bytes_hex}`, stored as `sha256(secret)` — shown once on create
- Razorpay webhook: verified via `X-Razorpay-Signature` before any processing
- All endpoints require API key auth except `/billing/webhook/` (public, signature-verified) and `/auth/` routes

---

## Backoff Formula

```python
import random

def backoff_delay(attempt: int) -> float:
    """Full jitter exponential backoff. Returns seconds."""
    base = 30  # seconds
    cap = 7200  # 2 hours max
    exp = min(cap, base * (2 ** (attempt - 1)))
    return random.uniform(0, exp)
```

Attempt schedule (approximate):
- 1: 0s (immediate)
- 2: 0–30s
- 3: 0–60s
- 4: 0–120s
- 5: 0–240s... (capped at 2h)
- 6: DLQ
