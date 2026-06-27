import pytest
from rest_framework.test import APIClient
from .factories import (
    TenantFactory, APIKeyFactory, WebhookEndpointFactory,
    WebhookEventFactory, RAW_KEY
)

@pytest.fixture
def tenant(db):
    return TenantFactory()

@pytest.fixture
def api_key(tenant):
    return APIKeyFactory(tenant=tenant)

@pytest.fixture
def auth_headers(api_key):
    """Dict to pass to APIClient: client.get(..., **auth_headers)"""
    return {"HTTP_X_RELAY_KEY": RAW_KEY}

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def authed_client(api_key):
    c = APIClient()
    c.credentials(HTTP_X_RELAY_KEY=RAW_KEY)
    return c

@pytest.fixture
def endpoint(tenant):
    return WebhookEndpointFactory(tenant=tenant)

@pytest.fixture
def event(tenant, endpoint):
    return WebhookEventFactory(tenant=tenant, endpoint=endpoint)

@pytest.fixture
def pro_tenant(db):
    return TenantFactory(plan="pro", delivery_count=0)

@pytest.fixture
def quota_exceeded_tenant(db):
    return TenantFactory(plan="free", delivery_count=1000)

@pytest.fixture
def scale_tenant(db):
    return TenantFactory(plan="scale", delivery_count=0)
