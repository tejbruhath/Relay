import hashlib
import pytest
from apps.core.utils import generate_api_key
from tests.factories import (
    APIKeyFactory,
    TenantFactory,
    WebhookEndpointFactory,
    WebhookEventFactory,
)


@pytest.fixture
def tenant():
    """Active tenant on free plan, delivery_count=0"""
    return TenantFactory(plan='free', delivery_count=0, is_active=True)


@pytest.fixture
def pro_tenant():
    """Tenant on pro plan, delivery_count=0"""
    return TenantFactory(plan='pro', delivery_count=0, is_active=True)


@pytest.fixture
def quota_exceeded_tenant():
    """Free tenant with delivery_count=1000 (quota limit for free plan)"""
    return TenantFactory(plan='free', delivery_count=1000, is_active=True)


@pytest.fixture
def api_key(tenant):
    """(raw_key, APIKey) for the tenant"""
    raw_key, key_hash, prefix = generate_api_key()
    key_obj = APIKeyFactory(
        tenant=tenant,
        key_hash=key_hash,
        prefix=prefix,
        is_active=True,
    )
    return raw_key, key_obj


@pytest.fixture
def auth_headers(api_key):
    """{'HTTP_X_RELAY_KEY': raw_key} for APIClient"""
    raw_key, _ = api_key
    return {'HTTP_X_RELAY_KEY': raw_key}


@pytest.fixture
def endpoint(tenant):
    """Active endpoint belonging to tenant"""
    return WebhookEndpointFactory(tenant=tenant, is_active=True)


@pytest.fixture
def event(tenant, endpoint):
    """Pending event for the tenant/endpoint"""
    return WebhookEventFactory(tenant=tenant, endpoint=endpoint)
