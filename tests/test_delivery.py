import pytest
import httpx
from unittest.mock import patch, MagicMock
from apps.webhooks.tasks import dispatch_webhook
from apps.webhooks.models import WebhookEvent, DeliveryAttempt
import redis as redis_lib
from django.conf import settings

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clean_redis():
    # Clean Redis rates to avoid cross-test contamination
    rate_limit_redis = redis_lib.Redis.from_url(settings.RATE_LIMIT_REDIS_URL, decode_responses=True)
    rate_limit_redis.flushdb()
    dlq_redis = redis_lib.Redis.from_url(settings.CACHES['default']['LOCATION'], decode_responses=True)
    dlq_redis.flushdb()


@patch('httpx.post')
def test_dispatch_webhook_success(mock_post, event):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = 'ok'
    mock_post.return_value = mock_response

    dispatch_webhook(str(event.id), attempt_number=1)

    event.refresh_from_db()
    assert event.status == WebhookEvent.STATUS_DELIVERED
    assert event.attempt_count == 1
    assert event.delivered_at is not None

    tenant = event.tenant
    tenant.refresh_from_db()
    assert tenant.delivery_count == 1

    attempt = DeliveryAttempt.objects.get(event=event)
    assert attempt.status == DeliveryAttempt.STATUS_SUCCESS
    assert attempt.http_status_code == 200


@patch('httpx.post')
@patch('apps.webhooks.tasks.dispatch_webhook.apply_async')
def test_dispatch_webhook_failure_retry(mock_apply_async, mock_post, event):
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = 'internal server error'
    mock_post.return_value = mock_response

    dispatch_webhook(str(event.id), attempt_number=1)

    event.refresh_from_db()
    assert event.status == WebhookEvent.STATUS_PENDING
    assert event.attempt_count == 1

    attempt = DeliveryAttempt.objects.get(event=event)
    assert attempt.status == DeliveryAttempt.STATUS_FAILURE
    assert attempt.http_status_code == 500

    mock_apply_async.assert_called_once()
    kwargs = mock_apply_async.call_args.kwargs
    assert kwargs['args'] == [str(event.id), 2]
    assert 'countdown' in kwargs


@patch('httpx.post')
def test_dispatch_webhook_dlq_on_max_attempts(mock_post, event):
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = 'internal server error'
    mock_post.return_value = mock_response

    # Attempt 6 (MAX_ATTEMPTS)
    dispatch_webhook(str(event.id), attempt_number=6)

    event.refresh_from_db()
    assert event.status == WebhookEvent.STATUS_FAILED
    assert event.attempt_count == 6

    # Verify DLQ insertion
    dlq_redis = redis_lib.Redis.from_url(settings.CACHES['default']['LOCATION'], decode_responses=True)
    messages = dlq_redis.xread({'relay:dlq': '0'}, count=100)
    assert len(messages) > 0
    assert messages[0][1][0][1]['event_id'] == str(event.id)


@patch('httpx.post')
@patch('apps.webhooks.tasks.dispatch_webhook.apply_async')
def test_dispatch_webhook_timeout(mock_apply_async, mock_post, event):
    mock_post.side_effect = httpx.TimeoutException("Timeout")

    dispatch_webhook(str(event.id), attempt_number=1)

    attempt = DeliveryAttempt.objects.get(event=event)
    assert attempt.status == DeliveryAttempt.STATUS_TIMEOUT

    mock_apply_async.assert_called_once()


@patch('httpx.post')
@patch('apps.webhooks.tasks.dispatch_webhook.apply_async')
def test_dispatch_webhook_rate_limit(mock_apply_async, mock_post, event):
    # Set a small rate limit on endpoint
    event.endpoint.rate_limit_per_minute = 1
    event.endpoint.save()

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = 'ok'
    mock_post.return_value = mock_response

    # First call should succeed
    dispatch_webhook(str(event.id), attempt_number=1)
    assert DeliveryAttempt.objects.filter(event=event).count() == 1

    # Create second event
    from tests.factories import WebhookEventFactory
    event2 = WebhookEventFactory(tenant=event.tenant, endpoint=event.endpoint)
    
    # Second call should be rate limited and rescheduled
    dispatch_webhook(str(event2.id), attempt_number=1)
    
    # No new attempt made
    assert DeliveryAttempt.objects.filter(event=event2).count() == 0
    
    # Task rescheduled with countdown 60
    mock_apply_async.assert_called_once()
    kwargs = mock_apply_async.call_args.kwargs
    assert kwargs['args'] == [str(event2.id), 1]
    assert kwargs['countdown'] == 60
