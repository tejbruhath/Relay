import pytest
from django.urls import reverse
from tests.factories import TenantFactory

pytestmark = pytest.mark.django_db

def test_usage_api_returns_count(client):
    tenant = TenantFactory(delivery_count=500)
    from tests.factories import APIKeyFactory, RAW_KEY
    APIKeyFactory(tenant=tenant)
    client.credentials(HTTP_X_RELAY_KEY=RAW_KEY)
    
    url = reverse("usage-detail")
    response = client.get(url)
    
    assert response.status_code == 200
    assert response.data["delivery_count"] == 500
    assert response.data["plan"] == "free"
    assert response.data["delivery_quota"] == 1000
