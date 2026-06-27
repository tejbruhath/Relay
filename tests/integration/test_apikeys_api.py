import pytest
from django.urls import reverse
from apps.tenants.models import APIKey
from tests.factories import TenantFactory

pytestmark = pytest.mark.django_db

def test_create_apikey_returns_201_with_raw_key(authed_client, api_key):
    url = reverse("apikey-list")
    data = {"name": "New Key"}
    response = authed_client.post(url, data, format="json")
    
    assert response.status_code == 201
    assert "api_key" in response.data
    assert response.data["api_key"].startswith("rly_live_")

def test_create_apikey_requires_auth(client):
    url = reverse("apikey-list")
    data = {"name": "New Key"}
    response = client.post(url, data, format="json")
    assert response.status_code == 401

def test_list_apikeys_returns_own_only(authed_client, api_key, tenant):
    # Create a key for another tenant
    other_tenant = TenantFactory()
    from tests.factories import APIKeyFactory
    APIKeyFactory(tenant=other_tenant)
    
    url = reverse("apikey-list")
    response = authed_client.get(url)
    
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["id"] == str(api_key.id)

def test_revoke_apikey_sets_inactive(authed_client, api_key):
    url = reverse("apikey-detail", args=[api_key.id])
    response = authed_client.delete(url)
    
    assert response.status_code == 204
    
    api_key.refresh_from_db()
    assert api_key.is_active is False
