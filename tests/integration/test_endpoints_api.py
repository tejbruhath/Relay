import pytest
from django.urls import reverse
from django.test.utils import CaptureQueriesContext
from django.db import connection
from apps.webhooks.models import WebhookEndpoint
from tests.factories import WebhookEndpointFactory, TenantFactory

pytestmark = pytest.mark.django_db

def test_create_endpoint_returns_201_with_signing_secret(authed_client):
    url = reverse("endpoint-list")
    data = {
        "url": "https://example.com/webhook",
        "description": "Primary endpoint",
        "rate_limit_per_minute": 100
    }
    response = authed_client.post(url, data, format="json")
    
    assert response.status_code == 201
    assert "signing_secret" in response.data
    assert response.data["signing_secret"].startswith("whsec_")

def test_create_endpoint_requires_auth(client):
    url = reverse("endpoint-list")
    data = {"url": "https://example.com"}
    response = client.post(url, data, format="json")
    assert response.status_code == 401

def test_list_endpoints_returns_own_only(authed_client, tenant):
    WebhookEndpointFactory(tenant=tenant)
    WebhookEndpointFactory(tenant=tenant)
    
    other_tenant = TenantFactory()
    WebhookEndpointFactory(tenant=other_tenant)
    
    url = reverse("endpoint-list")
    response = authed_client.get(url)
    
    assert response.status_code == 200
    assert len(response.data["results"]) == 2

def test_list_endpoints_cached_on_second_call(authed_client, tenant):
    WebhookEndpointFactory(tenant=tenant)
    url = reverse("endpoint-list")
    
    # First call - should hit DB
    with CaptureQueriesContext(connection) as ctx1:
        response1 = authed_client.get(url)
    assert response1.status_code == 200
    db_queries_1 = len(ctx1.captured_queries)
    
    # Second call - should hit cache
    with CaptureQueriesContext(connection) as ctx2:
        response2 = authed_client.get(url)
    assert response2.status_code == 200
    db_queries_2 = len(ctx2.captured_queries)
    
    # DB queries in second call should be significantly fewer (or zero for the main list query)
    # Auth usually hits DB once, but the view cache prevents the view query.
    assert db_queries_2 < db_queries_1

def test_patch_endpoint_updates_fields(authed_client, endpoint):
    url = reverse("endpoint-detail", args=[endpoint.id])
    data = {
        "description": "Updated description",
        "rate_limit_per_minute": 120
    }
    response = authed_client.patch(url, data, format="json")
    
    assert response.status_code == 200
    endpoint.refresh_from_db()
    assert endpoint.description == "Updated description"
    assert endpoint.rate_limit_per_minute == 120

def test_patch_endpoint_cannot_change_url(authed_client, endpoint):
    original_url = endpoint.url
    url = reverse("endpoint-detail", args=[endpoint.id])
    data = {"url": "https://new-url.com"}
    
    response = authed_client.patch(url, data, format="json")
    
    # Depending on DRF serializer, it might ignore read-only fields or return 400
    # Our design should ignore it or reject. Let's assert DB didn't change
    endpoint.refresh_from_db()
    assert endpoint.url == original_url

def test_delete_endpoint_sets_inactive(authed_client, endpoint):
    url = reverse("endpoint-detail", args=[endpoint.id])
    response = authed_client.delete(url)
    
    assert response.status_code == 204
    endpoint.refresh_from_db()
    assert endpoint.is_active is False

def test_delete_endpoint_owned_by_other_tenant_returns_404(authed_client):
    other_tenant = TenantFactory()
    other_endpoint = WebhookEndpointFactory(tenant=other_tenant)
    
    url = reverse("endpoint-detail", args=[other_endpoint.id])
    response = authed_client.delete(url)
    
    assert response.status_code == 404

def test_create_endpoint_invalidates_list_cache(authed_client, tenant):
    url = reverse("endpoint-list")
    
    # Prime cache
    response1 = authed_client.get(url)
    assert len(response1.data["results"]) == 0
    
    # Create new endpoint
    data = {"url": "https://example.com", "rate_limit_per_minute": 60}
    authed_client.post(url, data, format="json")
    
    # Second GET should reflect new endpoint
    response2 = authed_client.get(url)
    assert len(response2.data["results"]) == 1
