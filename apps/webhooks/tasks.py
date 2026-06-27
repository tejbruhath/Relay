import json
import time

import httpx
import redis as redis_lib
from celery import shared_task
from django.conf import settings
from django.db.models import F
from django.utils import timezone

from apps.core.cache import invalidate
from apps.core.utils import backoff_delay, compute_hmac_signature
from apps.webhooks.models import DeliveryAttempt, WebhookEvent

rate_limit_redis = redis_lib.Redis.from_url(
    settings.RATE_LIMIT_REDIS_URL, decode_responses=True
)

dlq_redis = redis_lib.Redis.from_url(
    settings.CACHES['default']['LOCATION'], decode_responses=True
)

MAX_ATTEMPTS = 6


@shared_task(bind=True, name='webhooks.dispatch_webhook', acks_late=True)
def dispatch_webhook(self, event_id: str, attempt_number: int = 1):
    try:
        event = WebhookEvent.objects.select_related('endpoint', 'tenant').get(id=event_id)
    except WebhookEvent.DoesNotExist:
        return

    endpoint = event.endpoint
    tenant = event.tenant

    window_minute = int(time.time()) // 60
    rate_key = f"relay:ratelimit:{endpoint.id}:{window_minute}"
    current_count = rate_limit_redis.incr(rate_key)
    if current_count == 1:
        rate_limit_redis.expire(rate_key, 120)
    if current_count > endpoint.rate_limit_per_minute:
        self.apply_async(
            args=[event_id, attempt_number], countdown=60
        )
        return

    payload = {
        'event_id': str(event.id),
        'event_type': event.event_type,
        'created_at': event.created_at.isoformat(),
        'data': event.payload,
    }
    payload_json = json.dumps(payload, separators=(',', ':'))
    timestamp = int(time.time())

    # Using secret_hash as HMAC key — tradeoff: we don't store raw secrets
    signature = compute_hmac_signature(endpoint.secret_hash, timestamp, payload_json)

    headers = {
        'Content-Type': 'application/json',
        'X-Relay-Event-ID': str(event.id),
        'X-Relay-Event-Type': event.event_type,
        'X-Relay-Timestamp': str(timestamp),
        'X-Relay-Signature': signature,
    }

    start_ms = time.monotonic()
    try:
        response = httpx.post(
            endpoint.url, content=payload_json, headers=headers, timeout=30.0
        )
        duration_ms = int((time.monotonic() - start_ms) * 1000)

        if 200 <= response.status_code < 300:
            DeliveryAttempt.objects.create(
                event=event,
                attempt_number=attempt_number,
                status=DeliveryAttempt.STATUS_SUCCESS,
                http_status_code=response.status_code,
                response_body=response.text[:4096],
                duration_ms=duration_ms,
            )
            event.status = WebhookEvent.STATUS_DELIVERED
            event.delivered_at = timezone.now()
            event.attempt_count = attempt_number
            event.save(update_fields=['status', 'delivered_at', 'attempt_count'])

            from apps.tenants.models import Tenant
            Tenant.objects.filter(id=tenant.id).update(delivery_count=F('delivery_count') + 1)
            invalidate(f'relay:cache:usage:{tenant.id}')
            invalidate(f'relay:cache:event:{event.id}', f'relay:cache:events:{tenant.id}')
        else:
            DeliveryAttempt.objects.create(
                event=event,
                attempt_number=attempt_number,
                status=DeliveryAttempt.STATUS_FAILURE,
                http_status_code=response.status_code,
                response_body=response.text[:4096],
                duration_ms=duration_ms,
            )
            _handle_retry_or_dlq(self, event, attempt_number)

    except httpx.TimeoutException:
        duration_ms = int((time.monotonic() - start_ms) * 1000)
        DeliveryAttempt.objects.create(
            event=event,
            attempt_number=attempt_number,
            status=DeliveryAttempt.STATUS_TIMEOUT,
            duration_ms=duration_ms,
            error_message='Request timed out after 30s',
        )
        _handle_retry_or_dlq(self, event, attempt_number)

    except httpx.RequestError as exc:
        duration_ms = int((time.monotonic() - start_ms) * 1000)
        DeliveryAttempt.objects.create(
            event=event,
            attempt_number=attempt_number,
            status=DeliveryAttempt.STATUS_FAILURE,
            duration_ms=duration_ms,
            error_message=str(exc)[:500],
        )
        _handle_retry_or_dlq(self, event, attempt_number)


def _handle_retry_or_dlq(task, event, attempt_number):
    event.attempt_count = attempt_number
    event.save(update_fields=['attempt_count'])

    if attempt_number < MAX_ATTEMPTS:
        delay = backoff_delay(attempt_number)
        dispatch_webhook.apply_async(
            args=[str(event.id), attempt_number + 1],
            countdown=delay,
        )
    else:
        event.status = WebhookEvent.STATUS_FAILED
        event.save(update_fields=['status'])
        from apps.core.cache import invalidate
        invalidate(f'relay:cache:event:{event.id}', f'relay:cache:events:{event.tenant_id}')
        dlq_redis.xadd('relay:dlq', {
            'event_id': str(event.id),
            'tenant_id': str(event.tenant_id),
            'endpoint_url': event.endpoint.url,
        })


@shared_task(name='webhooks.process_dlq')
def process_dlq():
    messages = dlq_redis.xread({'relay:dlq': '0'}, count=100)
    if not messages:
        return

    for stream_name, entries in messages:
        for message_id, data in entries:
            event_id = data.get('event_id')
            if event_id:
                WebhookEvent.objects.filter(id=event_id).update(status=WebhookEvent.STATUS_DEAD)
            dlq_redis.xack('relay:dlq', 'relay-processor', message_id)
            dlq_redis.xdel('relay:dlq', message_id)
