import pytest
import respx
import httpx
from uuid import uuid4
from apps.tenants.models import Tenant

pytestmark = [pytest.mark.e2e, pytest.mark.django_db]

MOCK_TARGET_URL = "http://mock-target.internal/webhook"

@respx.mock
def test_free_plan_blocks_at_1000(client):
    register_res = client.post("/api/v1/auth/register/", {
        "name": f"E2E Tenant {uuid4()}",
        "email": f"e2e_{uuid4()}@test.com",
        "password": "pwd"
    }, format="json")
    api_key = register_res.json()["api_key"]
    tenant_id = register_res.json()["tenant_id"]
    
    # Manually update DB
    Tenant.objects.filter(id=tenant_id).update(delivery_count=999)
    
    client.credentials(HTTP_X_RELAY_KEY=api_key)
    
    ep_res = client.post("/api/v1/endpoints/", {
        "url": MOCK_TARGET_URL,
        "rate_limit_per_minute": 1000
    }, format="json")
    endpoint_id = ep_res.json()["id"]
    
    respx.post(MOCK_TARGET_URL).mock(return_value=httpx.Response(200, text="OK"))
    
    # First dispatch (999 -> 1000) should work
    ev_res1 = client.post("/api/v1/events/", {
        "endpoint_id": endpoint_id,
        "event_type": "test",
        "payload": {},
        "idempotency_key": str(uuid4())
    }, format="json")
    assert ev_res1.status_code == 202
    
    # Second dispatch (1000 -> 1001) should fail
    ev_res2 = client.post("/api/v1/events/", {
        "endpoint_id": endpoint_id,
        "event_type": "test",
        "payload": {},
        "idempotency_key": str(uuid4())
    }, format="json")
    assert ev_res2.status_code == 402

@respx.mock
def test_scale_plan_has_no_quota(client):
    register_res = client.post("/api/v1/auth/register/", {
        "name": f"E2E Tenant {uuid4()}",
        "email": f"e2e_{uuid4()}@test.com",
        "password": "pwd"
    }, format="json")
    api_key = register_res.json()["api_key"]
    tenant_id = register_res.json()["tenant_id"]
    
    Tenant.objects.filter(id=tenant_id).update(plan="scale", delivery_count=999999)
    
    client.credentials(HTTP_X_RELAY_KEY=api_key)
    
    ep_res = client.post("/api/v1/endpoints/", {
        "url": MOCK_TARGET_URL,
        "rate_limit_per_minute": 1000
    }, format="json")
    endpoint_id = ep_res.json()["id"]
    
    respx.post(MOCK_TARGET_URL).mock(return_value=httpx.Response(200, text="OK"))
    
    ev_res = client.post("/api/v1/events/", {
        "endpoint_id": endpoint_id,
        "event_type": "test",
        "payload": {},
        "idempotency_key": str(uuid4())
    }, format="json")
    assert ev_res.status_code == 202
