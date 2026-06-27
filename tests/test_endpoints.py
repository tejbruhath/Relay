import pytest
from django.test import override_settings
from rest_framework.test import APIClient
from apps.webhooks.models import WebhookEndpoint
from tests.factories import WebhookEndpointFactory

pytestmark = pytest.mark.django_db


def test_create_endpoint_success(auth_headers, tenant):
    client = APIClient()
    response = client.post('/api/v1/endpoints/', {
        'url': 'https://example.com/webhook',
        'description': 'Main endpoint'
    }, format='json', **auth_headers)

    assert response.status_code == 201
    assert response.data['url'] == 'https://example.com/webhook'
    assert 'signing_secret' in response.data

    endpoint = WebhookEndpoint.objects.get(id=response.data['id'])
    assert endpoint.tenant == tenant


def test_list_endpoints(auth_headers, tenant, endpoint):
    client = APIClient()
    response = client.get('/api/v1/endpoints/', **auth_headers)

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['id'] == str(endpoint.id)


@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
def test_endpoint_cache_aside(auth_headers, endpoint):
    client = APIClient()
    
    # First call hits DB and populates cache
    response1 = client.get(f'/api/v1/endpoints/{endpoint.id}/', **auth_headers)
    assert response1.status_code == 200

    # We manually update DB to check if cache is served
    WebhookEndpoint.objects.filter(id=endpoint.id).update(description="Changed in DB")

    # Second call should hit cache and return old description
    response2 = client.get(f'/api/v1/endpoints/{endpoint.id}/', **auth_headers)
    assert response2.status_code == 200
    assert response2.data['description'] == endpoint.description

    # Patch invalidates cache
    response3 = client.patch(f'/api/v1/endpoints/{endpoint.id}/', {'description': 'Patched via API'}, format='json', **auth_headers)
    assert response3.status_code == 200

    # Next get should fetch the updated cache
    response4 = client.get(f'/api/v1/endpoints/{endpoint.id}/', **auth_headers)
    assert response4.status_code == 200
    assert response4.data['description'] == 'Patched via API'


def test_patch_endpoint(auth_headers, endpoint):
    client = APIClient()
    response = client.patch(f'/api/v1/endpoints/{endpoint.id}/', {'description': 'New description'}, format='json', **auth_headers)
    assert response.status_code == 200
    assert response.data['description'] == 'New description'


def test_delete_endpoint(auth_headers, endpoint):
    client = APIClient()
    response = client.delete(f'/api/v1/endpoints/{endpoint.id}/', **auth_headers)
    assert response.status_code == 204

    endpoint.refresh_from_db()
    assert endpoint.is_active is False


def test_get_endpoint_ownership_check(auth_headers, tenant):
    other_endpoint = WebhookEndpointFactory() # creates another tenant
    client = APIClient()
    response = client.get(f'/api/v1/endpoints/{other_endpoint.id}/', **auth_headers)
    assert response.status_code == 404
