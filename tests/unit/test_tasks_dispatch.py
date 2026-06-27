import pytest
import httpx
from unittest.mock import patch
from apps.webhooks.tasks import dispatch_webhook
from apps.webhooks.models import WebhookEvent, DeliveryAttempt
from apps.tenants.models import Tenant
from tests.factories import WebhookEventFactory

pytestmark = pytest.mark.django_db

@patch("apps.webhooks.tasks.httpx.Client.post")
@patch("apps.webhooks.tasks.redis.from_url")
def test_dispatch_success_marks_event_delivered(mock_redis, mock_post):
    event = WebhookEventFactory()
    
    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.incr.return_value = 1  # Rate limit counter
    
    mock_response = httpx.Response(200, content=b"OK")
    mock_post.return_value = mock_response

    dispatch_webhook(event_id=str(event.id), attempt_number=1)

    event.refresh_from_db()
    assert event.status == "delivered"
    
    attempt = DeliveryAttempt.objects.get(event=event)
    assert attempt.status == "success"
    assert attempt.http_status_code == 200

@patch("apps.webhooks.tasks.httpx.Client.post")
@patch("apps.webhooks.tasks.redis.from_url")
def test_dispatch_success_increments_delivery_count(mock_redis, mock_post):
    event = WebhookEventFactory()
    tenant = event.tenant
    assert tenant.delivery_count == 0

    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.incr.return_value = 1
    
    mock_response = httpx.Response(200, content=b"OK")
    mock_post.return_value = mock_response

    dispatch_webhook(event_id=str(event.id), attempt_number=1)

    tenant.refresh_from_db()
    assert tenant.delivery_count == 1

@patch("apps.webhooks.tasks.httpx.Client.post")
@patch("apps.webhooks.tasks.dispatch_webhook.apply_async")
@patch("apps.webhooks.tasks.redis.from_url")
def test_dispatch_non_2xx_creates_failure_attempt(mock_redis, mock_apply, mock_post):
    event = WebhookEventFactory()
    
    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.incr.return_value = 1
    
    mock_response = httpx.Response(500, content=b"Error")
    mock_post.return_value = mock_response

    dispatch_webhook(event_id=str(event.id), attempt_number=1)

    attempt = DeliveryAttempt.objects.get(event=event)
    assert attempt.status == "failure"
    assert attempt.http_status_code == 500

@patch("apps.webhooks.tasks.httpx.Client.post")
@patch("apps.webhooks.tasks.dispatch_webhook.apply_async")
@patch("apps.webhooks.tasks.redis.from_url")
def test_dispatch_non_2xx_requeues_on_attempt_lt_6(mock_redis, mock_apply, mock_post):
    event = WebhookEventFactory()
    
    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.incr.return_value = 1
    
    mock_response = httpx.Response(500, content=b"Error")
    mock_post.return_value = mock_response

    dispatch_webhook(event_id=str(event.id), attempt_number=3)

    assert mock_apply.called
    kwargs = mock_apply.call_args[1]
    assert kwargs["kwargs"]["attempt_number"] == 4

@patch("apps.webhooks.tasks.httpx.Client.post")
@patch("apps.webhooks.tasks.dispatch_webhook.apply_async")
@patch("apps.webhooks.tasks.redis.from_url")
def test_dispatch_non_2xx_sends_to_dlq_on_attempt_6(mock_redis, mock_apply, mock_post):
    event = WebhookEventFactory()
    
    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.incr.return_value = 1
    
    mock_response = httpx.Response(500, content=b"Error")
    mock_post.return_value = mock_response

    dispatch_webhook(event_id=str(event.id), attempt_number=6)

    mock_redis_inst.xadd.assert_called_once()
    event.refresh_from_db()
    assert event.status == "dead"
    assert not mock_apply.called

@patch("apps.webhooks.tasks.httpx.Client.post")
@patch("apps.webhooks.tasks.dispatch_webhook.apply_async")
@patch("apps.webhooks.tasks.redis.from_url")
def test_dispatch_timeout_creates_timeout_attempt(mock_redis, mock_apply, mock_post):
    event = WebhookEventFactory()
    
    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.incr.return_value = 1
    
    mock_post.side_effect = httpx.TimeoutException("Timeout")

    dispatch_webhook(event_id=str(event.id), attempt_number=1)

    attempt = DeliveryAttempt.objects.get(event=event)
    assert attempt.status == "timeout"

@patch("apps.webhooks.tasks.dispatch_webhook.apply_async")
@patch("apps.webhooks.tasks.redis.from_url")
def test_dispatch_rate_limited_requeues_with_60s_countdown(mock_redis, mock_apply):
    event = WebhookEventFactory()
    event.endpoint.rate_limit_per_minute = 60
    event.endpoint.save()
    
    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.incr.return_value = 61  # Over limit

    dispatch_webhook(event_id=str(event.id), attempt_number=1)

    assert mock_apply.called
    kwargs = mock_apply.call_args[1]
    assert kwargs["countdown"] == 60
    assert kwargs["kwargs"]["attempt_number"] == 1  # Not incremented

@patch("apps.webhooks.tasks.httpx.Client.post")
@patch("apps.webhooks.tasks.redis.from_url")
def test_dispatch_response_body_truncated_to_4096(mock_redis, mock_post):
    event = WebhookEventFactory()
    
    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.incr.return_value = 1
    
    long_body = b"A" * 10000
    mock_response = httpx.Response(200, content=long_body)
    mock_post.return_value = mock_response

    dispatch_webhook(event_id=str(event.id), attempt_number=1)

    attempt = DeliveryAttempt.objects.get(event=event)
    assert len(attempt.response_body) == 4096

@patch("apps.webhooks.tasks.httpx.Client.post")
@patch("apps.webhooks.tasks.redis.from_url")
def test_dispatch_outbound_headers_contain_hmac(mock_redis, mock_post):
    event = WebhookEventFactory()
    
    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.incr.return_value = 1
    
    mock_response = httpx.Response(200, content=b"OK")
    mock_post.return_value = mock_response

    dispatch_webhook(event_id=str(event.id), attempt_number=1)

    kwargs = mock_post.call_args[1]
    headers = kwargs["headers"]
    
    assert "X-Relay-Signature" in headers
    assert headers["X-Relay-Signature"].startswith("sha256=")
    assert "X-Relay-Event-ID" in headers
    assert "X-Relay-Timestamp" in headers
    assert "X-Relay-Event-Type" in headers
    assert headers["X-Relay-Event-ID"] == str(event.id)
