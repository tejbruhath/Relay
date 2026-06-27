import pytest
from unittest.mock import patch
from rest_framework.test import APIClient
from apps.webhooks.models import WebhookEvent
from tests.factories import WebhookEndpointFactory

pytestmark = pytest.mark.django_db


@patch('apps.webhooks.tasks.dispatch_webhook.delay')
def test_dispatch_event_success(mock_delay, auth_headers, endpoint, tenant):
    client = APIClient()
    response = client.post('/api/v1/events/', {
        'endpoint_id': str(endpoint.id),
        'event_type': 'user.created',
        'payload': {'id': 1},
        'idempotency_key': 'idem_123'
    }, format='json', **auth_headers)

    assert response.status_code == 202
    assert 'event_id' in response.data

    event = WebhookEvent.objects.get(id=response.data['event_id'])
    assert event.event_type == 'user.created'
    assert event.status == WebhookEvent.STATUS_PENDING
    
    mock_delay.assert_called_once_with(str(event.id), attempt_number=1)


@patch('apps.webhooks.tasks.dispatch_webhook.delay')
def test_dispatch_duplicate_idempotency_key_409(mock_delay, auth_headers, endpoint):
    client = APIClient()
    payload = {
        'endpoint_id': str(endpoint.id),
        'event_type': 'user.created',
        'payload': {'id': 1},
        'idempotency_key': 'idem_dup'
    }
    
    # First request
    response1 = client.post('/api/v1/events/', payload, format='json', **auth_headers)
    assert response1.status_code == 202
    
    # Duplicate request
    response2 = client.post('/api/v1/events/', payload, format='json', **auth_headers)
    assert response2.status_code == 409


@patch('apps.webhooks.tasks.dispatch_webhook.delay')
def test_dispatch_quota_exceeded_402(mock_delay, quota_exceeded_tenant, endpoint):
    # Need to generate key for quota exceeded tenant to auth
    from apps.core.utils import generate_api_key
    from tests.factories import APIKeyFactory
    raw_key, key_hash, prefix = generate_api_key()
    APIKeyFactory(tenant=quota_exceeded_tenant, key_hash=key_hash, prefix=prefix, is_active=True)
    
    # Endpoint must belong to quota_exceeded_tenant
    endpoint.tenant = quota_exceeded_tenant
    endpoint.save()

    client = APIClient()
    response = client.post('/api/v1/events/', {
        'endpoint_id': str(endpoint.id),
        'event_type': 'user.created',
        'payload': {'id': 1},
        'idempotency_key': 'idem_quota'
    }, format='json', HTTP_X_RELAY_KEY=raw_key)

    assert response.status_code == 402


def test_dispatch_ownership_404(auth_headers):
    # Endpoint belongs to a different tenant
    other_endpoint = WebhookEndpointFactory()
    
    client = APIClient()
    response = client.post('/api/v1/events/', {
        'endpoint_id': str(other_endpoint.id),
        'event_type': 'user.created',
        'payload': {'id': 1},
        'idempotency_key': 'idem_404'
    }, format='json', **auth_headers)

    assert response.status_code == 404


def test_list_events(auth_headers, event):
    client = APIClient()
    response = client.get('/api/v1/events/list/', **auth_headers)
    
    assert response.status_code == 200
    assert len(response.data['results']) == 1
    assert response.data['results'][0]['id'] == str(event.id)
