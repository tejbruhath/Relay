# Relay — API Specification

Base URL: `/api/v1/`
Auth: `X-Relay-Key: rly_live_<key>` header on all endpoints except `/auth/` and `/billing/webhook/`

---

## Auth

### POST `/auth/register/`
Register a new tenant. Creates tenant + generates one API key.

**Request:**
```json
{
  "name": "Acme Corp",
  "email": "admin@acme.com",
  "password": "strongpassword123"
}
```
**Response 201:**
```json
{
  "tenant_id": "uuid",
  "email": "admin@acme.com",
  "api_key": "rly_live_<full_raw_key>",  // shown ONCE, never again
  "api_key_prefix": "rly_live_XXXXXXXX"
}
```

### POST `/auth/login/`
Returns a short-lived JWT for session-based calls (optional, API key is primary auth).

---

## API Keys

### GET `/api-keys/`
List all active API keys for the tenant.
**Cache:** `relay:cache:apikeys:{tenant_id}` TTL 5min

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Production Key",
    "prefix": "rly_live_XXXXXXXX",
    "is_active": true,
    "last_used_at": "2025-10-01T12:00:00Z",
    "created_at": "2025-09-01T00:00:00Z"
  }
]
```

### POST `/api-keys/`
Create a new API key.
**Request:** `{ "name": "Staging Key" }`
**Response 201:** `{ "id": "uuid", "api_key": "rly_live_<full_raw_key>", "prefix": "..." }` (shown once)

### DELETE `/api-keys/{id}/`
Revoke an API key. Sets `is_active=False`. Invalidates cache.
**Response 204**

---

## Webhook Endpoints

### GET `/endpoints/`
List all endpoints for tenant.
**Cache:** `relay:cache:endpoints:{tenant_id}` TTL 5min

**Response 200:**
```json
[
  {
    "id": "uuid",
    "url": "https://acme.com/webhooks/relay",
    "description": "Production handler",
    "secret_prefix": "whsec_XXXXXXXX",
    "is_active": true,
    "rate_limit_per_minute": 60,
    "created_at": "..."
  }
]
```

### POST `/endpoints/`
Create a new endpoint. Auto-generates signing secret.
**Request:**
```json
{
  "url": "https://acme.com/webhooks/relay",
  "description": "Production handler",
  "rate_limit_per_minute": 60
}
```
**Response 201:**
```json
{
  "id": "uuid",
  "url": "...",
  "signing_secret": "whsec_<full_raw_secret>",  // shown ONCE
  "secret_prefix": "whsec_XXXXXXXX"
}
```

### PATCH `/endpoints/{id}/`
Update description, rate_limit, is_active. Cannot update URL or secret.
**Response 200:** Updated endpoint object (without secret)

### DELETE `/endpoints/{id}/`
Soft delete (sets is_active=False).
**Response 204**

---

## Events

### POST `/events/` — ASYNC VIEW
Dispatch a webhook event. Enqueues delivery task.

**Request:**
```json
{
  "endpoint_id": "uuid",
  "event_type": "order.created",
  "payload": { "order_id": "123", "amount": 5000 },
  "idempotency_key": "order-123-created"
}
```
**Response 202:**
```json
{
  "event_id": "uuid",
  "status": "pending",
  "queued_at": "2025-10-01T12:00:00Z"
}
```
**Error responses:**
- `402` — quota exceeded
- `409` — duplicate idempotency_key within 24h
- `404` — endpoint not found or inactive

### GET `/events/`
List events for tenant with pagination.
**Query params:** `status`, `endpoint_id`, `from`, `to`, `page`, `page_size` (max 100)
**Cache:** NOT cached (real-time status important)
**Response 200:** Paginated list of events

### GET `/events/{id}/`
Get single event.
**Cache:** `relay:cache:event:{id}` TTL 2min
**Response 200:** Event object with `attempt_count`

### GET `/events/{id}/attempts/` — ASYNC VIEW
Get all delivery attempts for an event.
**Cache:** `relay:cache:attempts:{event_id}` TTL 2min
**Response 200:**
```json
[
  {
    "id": "uuid",
    "attempt_number": 1,
    "status": "failure",
    "http_status_code": 500,
    "response_body": "Internal Server Error",
    "duration_ms": 234,
    "error_message": null,
    "attempted_at": "..."
  }
]
```

---

## Usage

### GET `/usage/`
Current month delivery usage for tenant.
**Cache:** `relay:cache:usage:{tenant_id}` TTL 1min

**Response 200:**
```json
{
  "plan": "pro",
  "delivery_count": 12450,
  "delivery_quota": 50000,
  "quota_exceeded": false,
  "period_start": "2025-10-01",
  "period_end": "2025-10-31"
}
```

---

## Billing

### POST `/billing/create-subscription/`
Create a Razorpay subscription for a plan.

**Request:** `{ "plan": "pro" }`
**Response 201:**
```json
{
  "subscription_id": "sub_XXXXXXXX",
  "razorpay_key_id": "rzp_live_XXXXX",
  "plan": "pro",
  "amount": 99900,
  "currency": "INR"
}
```
Frontend uses `subscription_id` + `razorpay_key_id` to open Razorpay Checkout.

### GET `/billing/subscription/`
Current subscription status.
**Cache:** `relay:cache:subscription:{tenant_id}` TTL 5min

**Response 200:**
```json
{
  "plan": "pro",
  "status": "active",
  "current_period_start": "2025-10-01T00:00:00Z",
  "current_period_end": "2025-10-31T23:59:59Z",
  "razorpay_subscription_id": "sub_XXXXXXXX"
}
```

### POST `/billing/webhook/` — PUBLIC, ASYNC VIEW
Razorpay webhook receiver. Verified via `X-Razorpay-Signature`.
**Response 200** always (Razorpay retries on anything else).

---

## Outbound Request Format

Every webhook delivery made by Relay to a tenant's endpoint:

```
POST https://tenant-endpoint.com/webhook
Content-Type: application/json
X-Relay-Event-ID: <event_uuid>
X-Relay-Event-Type: order.created
X-Relay-Timestamp: 1727784000
X-Relay-Signature: sha256=<hmac_hex>

{
  "event_id": "uuid",
  "event_type": "order.created",
  "created_at": "2025-10-01T12:00:00Z",
  "data": { ...tenant payload... }
}
```

HMAC input: `f"{timestamp}.{json.dumps(payload, separators=(',', ':'))}"`
