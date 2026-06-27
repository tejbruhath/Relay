import pytest
from unittest.mock import patch
from django.urls import reverse
from apps.webhooks.models import WebhookEvent
from tests.factories import TenantFactory, WebhookEndpointFactory, DeliveryAttemptFactory, WebhookEventFactory

pytestmark = pytest.mark.django_db

@patch("apps.webhooks.tasks.dispatch_webhook.delay")
def test_dispatch_returns_202_with_event_id(mock_delay, authed_client, endpoint):
    url = reverse("event-list")
    data = {
        "endpoint_id": str(endpoint.id),
        "event_type": "user.created",
        "payload": {"id": 1},
        "idempotency_key": "idem-123"
    }
    response = authed_client.post(url, data, format="json")
    
    assert response.status_code == 202
    assert "event_id" in response.data
    assert response.data["status"] == "pending"

@patch("apps.webhooks.tasks.dispatch_webhook.delay")
def test_dispatch_enqueues_celery_task(mock_delay, authed_client, endpoint):
    url = reverse("event-list")
    data = {
        "endpoint_id": str(endpoint.id),
        "event_type": "user.created",
        "payload": {"id": 1},
        "idempotency_key": "idem-123"
    }
    response = authed_client.post(url, data, format="json")
    
    event_id = response.data["event_id"]
    mock_delay.assert_called_once_with(event_id, 1)

@patch("apps.webhooks.tasks.dispatch_webhook.delay")
def test_dispatch_duplicate_idempotency_key_returns_409(mock_delay, authed_client, endpoint):
    url = reverse("event-list")
    data = {
        "endpoint_id": str(endpoint.id),
        "event_type": "user.created",
        "payload": {"id": 1},
        "idempotency_key": "idem-dup"
    }
    
    res1 = authed_client.post(url, data, format="json")
    assert res1.status_code == 202
    
    res2 = authed_client.post(url, data, format="json")
    assert res2.status_code == 409

@patch("apps.webhooks.tasks.dispatch_webhook.delay")
def test_dispatch_quota_exceeded_returns_402(mock_delay, client, api_key, quota_exceeded_tenant):
    api_key.tenant = quota_exceeded_tenant
    api_key.save()
    
    endpoint = WebhookEndpointFactory(tenant=quota_exceeded_tenant)
    client.credentials(HTTP_X_RELAY_KEY="rly_live_testkey00000000000000000000000000000000000000000000000000")
    
    url = reverse("event-list")
    data = {
        "endpoint_id": str(endpoint.id),
        "event_type": "test",
        "payload": {},
        "idempotency_key": "test"
    }
    response = client.post(url, data, format="json")
    assert response.status_code == 402

@patch("apps.webhooks.tasks.dispatch_webhook.delay")
def test_dispatch_wrong_endpoint_returns_404(mock_delay, authed_client):
    other_tenant = TenantFactory()
    other_endpoint = WebhookEndpointFactory(tenant=other_tenant)
    
    url = reverse("event-list")
    data = {
        "endpoint_id": str(other_endpoint.id),
        "event_type": "test",
        "payload": {},
        "idempotency_key": "test"
    }
    response = authed_client.post(url, data, format="json")
    assert response.status_code == 404

@patch("apps.webhooks.tasks.dispatch_webhook.delay")
def test_dispatch_inactive_endpoint_returns_404(mock_delay, authed_client, endpoint):
    endpoint.is_active = False
    endpoint.save()
    
    url = reverse("event-list")
    data = {
        "endpoint_id": str(endpoint.id),
        "event_type": "test",
        "payload": {},
        "idempotency_key": "test"
    }
    response = authed_client.post(url, data, format="json")
    assert response.status_code == 404

@patch("apps.webhooks.tasks.dispatch_webhook.delay")
def test_dispatch_creates_event_in_db(mock_delay, authed_client, endpoint):
    url = reverse("event-list")
    data = {
        "endpoint_id": str(endpoint.id),
        "event_type": "user.created",
        "payload": {"id": 1},
        "idempotency_key": "idem-123"
    }
    response = authed_client.post(url, data, format="json")
    
    event_id = response.data["event_id"]
    event = WebhookEvent.objects.get(id=event_id)
    assert event.status == "pending"

def test_get_event_returns_correct_fields(authed_client, event):
    url = reverse("event-detail", args=[event.id])
    response = authed_client.get(url)
    
    assert response.status_code == 200
    assert response.data["status"] == "pending"
    assert response.data["event_type"] == "order.created"
    assert "payload" in response.data
    assert response.data["attempt_count"] == 0

def test_get_event_wrong_tenant_returns_404(client, event):
    other_tenant = TenantFactory()
    from tests.factories import APIKeyFactory, RAW_KEY
    other_key = APIKeyFactory(tenant=other_tenant, key_hash="anotherhash")
    # Actually wait, I should just override the client key to standard test key,
    # but the fixture 'event' uses TenantFactory which creates a DIFFERENT tenant than the one 'authed_client' uses by default if they aren't linked.
    # Ah, I will just create a new tenant and use a different key or use authed_client against an event created for another tenant.
    
    new_tenant = TenantFactory()
    other_event = WebhookEventFactory(tenant=new_tenant)
    
    # authed_client uses `tenant` from the fixture, which is not `new_tenant`
    # We must patch the client credentials if we want to explicitly use a different one, 
    # but authed_client is already authenticated as `tenant`.
    
    url = reverse("event-detail", args=[other_event.id])
    client.credentials(HTTP_X_RELAY_KEY="rly_live_testkey00000000000000000000000000000000000000000000000000")
    # since authed_client uses the default tenant and other_event has new_tenant
    response = client.get(url)
    
    assert response.status_code == 404

def test_list_events_filter_by_status(authed_client, tenant, endpoint):
    WebhookEventFactory(tenant=tenant, endpoint=endpoint, status="pending")
    WebhookEventFactory(tenant=tenant, endpoint=endpoint, status="pending")
    WebhookEventFactory(tenant=tenant, endpoint=endpoint, status="pending")
    WebhookEventFactory(tenant=tenant, endpoint=endpoint, status="delivered")
    WebhookEventFactory(tenant=tenant, endpoint=endpoint, status="delivered")
    
    url = reverse("event-list")
    response = authed_client.get(url, {"status": "pending"})
    
    assert response.status_code == 200
    assert len(response.data["results"]) == 3

def test_get_attempts_returns_all_attempts(authed_client, event):
    DeliveryAttemptFactory(event=event, attempt_number=1, status="failure")
    DeliveryAttemptFactory(event=event, attempt_number=2, status="failure")
    DeliveryAttemptFactory(event=event, attempt_number=3, status="success")
    
    url = reverse("event-attempts", args=[event.id])
    response = authed_client.get(url)
    
    assert response.status_code == 200
    assert len(response.data["results"]) == 3
