# Relay — Code Structure

## Directory Layout

```
relay/
├── manage.py
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── celery.py
└── apps/
    ├── core/
    │   ├── __init__.py
    │   ├── authentication.py   # API key auth backend
    │   ├── cache.py            # cache-aside helpers
    │   ├── exceptions.py       # custom DRF exception handler
    │   ├── pagination.py       # standard cursor pagination
    │   └── utils.py            # HMAC signing, key generation, backoff
    ├── tenants/
    │   ├── __init__.py
    │   ├── models.py           # Tenant, APIKey
    │   ├── serializers.py      # TenantRegisterSerializer, APIKeySerializer
    │   ├── views.py            # TenantRegisterView, APIKeyViewSet
    │   ├── urls.py
    │   └── migrations/
    ├── webhooks/
    │   ├── __init__.py
    │   ├── models.py           # WebhookEndpoint, WebhookEvent, DeliveryAttempt
    │   ├── serializers.py      # EndpointSerializer, EventDispatchSerializer, AttemptSerializer
    │   ├── views.py            # EndpointViewSet, EventViewSet (async dispatch + attempts)
    │   ├── tasks.py            # dispatch_webhook, process_dlq
    │   ├── urls.py
    │   └── migrations/
    └── billing/
        ├── __init__.py
        ├── models.py           # Subscription, PaymentRecord
        ├── serializers.py      # SubscriptionSerializer, RazorpayWebhookSerializer
        ├── views.py            # CreateSubscriptionView, SubscriptionStatusView, RazorpayWebhookView
        ├── tasks.py            # reset_monthly_usage
        ├── razorpay_client.py  # thin wrapper around razorpay SDK
        ├── urls.py
        └── migrations/
```

---

## Pattern Rules (Non-Negotiable)

### Fat Serializers, Skinny Views

**Views do only this:**
```python
class EndpointViewSet(viewsets.ModelViewSet):
    serializer_class = EndpointSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WebhookEndpoint.objects.filter(tenant=self.request.tenant, is_active=True)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)
```

**Serializers do everything else:**
- Validation (field + cross-field + business rules)
- Cache reads/writes on GET serializers
- Side effects (key generation, Celery task dispatch, cache invalidation)
- Quota checks
- Razorpay API calls

### Cache-Aside Pattern

Every GET response that hits the DB must use this pattern via `apps.core.cache`:

```python
# core/cache.py
import json
import hashlib
from django.core.cache import cache

def cache_aside(key: str, fetch_fn, ttl: int):
    """
    Try cache first. On miss, call fetch_fn(), store result, return it.
    fetch_fn must return a JSON-serializable dict or list.
    """
    cached = cache.get(key)
    if cached is not None:
        return cached
    result = fetch_fn()
    cache.set(key, result, ttl)
    return result

def invalidate(key: str):
    cache.delete(key)
```

Usage in serializers:
```python
# In EndpointListSerializer or a list view mixin
CACHE_KEY = "relay:cache:endpoints:{tenant_id}"
CACHE_TTL = 300  # 5 minutes

def to_representation(self, instance):
    key = CACHE_KEY.format(tenant_id=instance.tenant_id)
    return cache_aside(key, lambda: super().to_representation(instance), CACHE_TTL)
```

### Async Views

Only these views are async:
- `EventViewSet.create` (dispatch)
- `EventViewSet.attempts` (list attempts)
- `RazorpayWebhookView.post`

```python
# webhooks/views.py
from adrf.viewsets import ViewSet as AsyncViewSet

class EventViewSet(AsyncViewSet):
    async def create(self, request):
        serializer = EventDispatchSerializer(data=request.data, context={'request': request})
        await sync_to_async(serializer.is_valid)(raise_exception=True)
        event = await sync_to_async(serializer.save)()
        return Response({'event_id': str(event.id), 'status': 'pending'}, status=202)
```

Use `adrf` package for async DRF views (`pip install adrf`).

---

## `core/utils.py` — Key Functions

```python
import hashlib
import hmac
import secrets
import random
import time

def generate_api_key() -> tuple[str, str, str]:
    """Returns (raw_key, key_hash, prefix)"""
    raw = f"rly_live_{secrets.token_hex(32)}"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[:16]
    return raw, key_hash, prefix

def generate_signing_secret() -> tuple[str, str, str]:
    """Returns (raw_secret, secret_hash, prefix)"""
    raw = f"whsec_{secrets.token_hex(32)}"
    secret_hash = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[:12]
    return raw, secret_hash, prefix

def compute_hmac_signature(raw_secret: str, timestamp: int, payload_json: str) -> str:
    """Returns hex HMAC-SHA256 of '{timestamp}.{payload_json}'"""
    message = f"{timestamp}.{payload_json}".encode()
    sig = hmac.new(raw_secret.encode(), message, hashlib.sha256)
    return f"sha256={sig.hexdigest()}"

def backoff_delay(attempt: int) -> float:
    """Full jitter exponential backoff. Returns seconds. Caps at 2h."""
    base = 30
    cap = 7200
    exp = min(cap, base * (2 ** (attempt - 1)))
    return random.uniform(0, exp)
```

---

## `core/authentication.py`

```python
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import hashlib
from apps.tenants.models import Tenant, APIKey

class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        raw_key = request.headers.get('X-Relay-Key')
        if not raw_key:
            return None
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        try:
            api_key = APIKey.objects.select_related('tenant').get(
                key_hash=key_hash, is_active=True, tenant__is_active=True
            )
        except APIKey.DoesNotExist:
            raise AuthenticationFailed('Invalid or inactive API key.')
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])
        return (api_key.tenant, api_key)
```

---

## `webhooks/tasks.py` — Structure

```python
from celery import shared_task
from django.utils import timezone
from apps.webhooks.models import WebhookEvent, DeliveryAttempt
from apps.core.utils import backoff_delay, compute_hmac_signature
import httpx
import json
import time
import redis

@shared_task(bind=True, name='webhooks.dispatch_webhook', acks_late=True)
def dispatch_webhook(self, event_id: str, attempt_number: int = 1):
    # 1. Fetch event, endpoint, tenant (select_related in one query)
    # 2. Check endpoint rate limit via Redis sliding window
    #    → If exceeded: self.apply_async(args=[event_id, attempt_number], countdown=60); return
    # 3. Build outbound payload + HMAC signature
    # 4. httpx.post(endpoint.url, ..., timeout=30)
    # 5. Create DeliveryAttempt record
    # 6. On 2xx success:
    #    → event.status = delivered, event.delivered_at = now()
    #    → tenant.delivery_count += 1 (use F() expression)
    #    → invalidate usage cache
    # 7. On failure:
    #    → if attempt_number < 6: requeue with backoff_delay(attempt_number)
    #    → if attempt_number >= 6: push to DLQ (Redis Streams XADD relay:dlq)

@shared_task(name='webhooks.process_dlq')
def process_dlq():
    # XREAD COUNT 100 STREAMS relay:dlq $
    # For each message: event.status = dead
    # XACK relay:dlq <message_id>

@shared_task(name='billing.reset_monthly_usage')
def reset_monthly_usage():
    # Tenant.objects.update(delivery_count=0)
    # Invalidate all usage caches (use cache key pattern scan or per-tenant)
```

---

## `billing/razorpay_client.py`

```python
import razorpay
from django.conf import settings

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

PLAN_IDS = {
    'pro': settings.RAZORPAY_PLAN_ID_PRO,
    'scale': settings.RAZORPAY_PLAN_ID_SCALE,
}

def create_subscription(tenant_id: str, plan: str) -> dict:
    return client.subscription.create({
        'plan_id': PLAN_IDS[plan],
        'total_count': 12,  # 12 billing cycles
        'notes': {'tenant_id': str(tenant_id)},
    }, idempotency_key=f"{tenant_id}-{plan}")

def verify_webhook_signature(payload_body: bytes, signature: str) -> bool:
    try:
        client.utility.verify_webhook_signature(
            payload_body.decode(), signature, settings.RAZORPAY_WEBHOOK_SECRET
        )
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
```

---

## Celery Beat Schedule (`config/celery.py`)

```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    'process-dlq': {
        'task': 'webhooks.process_dlq',
        'schedule': 300.0,  # every 5 minutes
    },
    'reset-monthly-usage': {
        'task': 'billing.reset_monthly_usage',
        'schedule': crontab(hour=0, minute=0, day_of_month=1),  # 1st of month midnight UTC
    },
}
```

---

## Requirements

### `requirements/base.txt`
```
Django==5.1.*
djangorestframework==3.15.*
adrf==0.1.*
celery==5.4.*
redis==5.0.*
httpx==0.27.*
razorpay==1.4.*
django-argon2==1.4.*
psycopg[binary]==3.2.*
django-redis==5.4.*
```

### `requirements/development.txt`
```
-r base.txt
django-debug-toolbar
pytest-django
pytest-asyncio
factory-boy
```
