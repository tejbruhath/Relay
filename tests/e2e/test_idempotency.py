import pytest
import respx
import httpx
import time
from uuid import uuid4
from apps.webhooks.models import WebhookEvent

pytestmark = [pytest.mark.e2e, pytest.mark.django_db]

MOCK_TARGET_URL = "http://mock-target.internal/webhook"

@respx.mock
def test_idempotency_key_deduplicates_within_24h(client):
    register_res = client.post("/api/v1/auth/register/", {
        "name": f"E2E Tenant {uuid4()}",
        "email": f"e2e_{uuid4()}@test.com",
        "password": "pwd"
    }, format="json")
    api_key = register_res.json()["api_key"]
    client.credentials(HTTP_X_RELAY_KEY=api_key)
    
    ep_res = client.post("/api/v1/endpoints/", {
        "url": MOCK_TARGET_URL,
        "rate_limit_per_minute": 1000
    }, format="json")
    endpoint_id = ep_res.json()["id"]
    
    respx.post(MOCK_TARGET_URL).mock(return_value=httpx.Response(200, text="OK"))
    
    idem_key = "order-123"
    
    ev_res1 = client.post("/api/v1/events/", {
        "endpoint_id": endpoint_id,
        "event_type": "test",
        "payload": {},
        "idempotency_key": idem_key
    }, format="json")
    assert ev_res1.status_code == 202
    event_id1 = ev_res1.json()["event_id"]
    
    ev_res2 = client.post("/api/v1/events/", {
        "endpoint_id": endpoint_id,
        "event_type": "test",
        "payload": {},
        "idempotency_key": idem_key
    }, format="json")
    assert ev_res2.status_code == 409
    
    # Assert only 1 event
    assert WebhookEvent.objects.filter(id=event_id1).count() == 1
    assert WebhookEvent.objects.count() == 1

@respx.mock
def test_idempotency_key_reusable_after_24h(client):
    register_res = client.post("/api/v1/auth/register/", {
        "name": f"E2E Tenant {uuid4()}",
        "email": f"e2e_{uuid4()}@test.com",
        "password": "pwd"
    }, format="json")
    api_key = register_res.json()["api_key"]
    tenant_id = register_res.json()["tenant_id"]
    client.credentials(HTTP_X_RELAY_KEY=api_key)
    
    ep_res = client.post("/api/v1/endpoints/", {
        "url": MOCK_TARGET_URL,
        "rate_limit_per_minute": 1000
    }, format="json")
    endpoint_id = ep_res.json()["id"]
    
    respx.post(MOCK_TARGET_URL).mock(return_value=httpx.Response(200, text="OK"))
    
    idem_key = "order-123"
    
    from unittest.mock import patch
    import redis
    
    # We will use fakeredis via from_url to manipulate ttl.
    # Actually wait, in e2e we are hitting the live redis stack (if running full E2E).
    # Since this is e2e we should hit actual redis if we want a true E2E, but since this runs with the Django test client (which shares our python process), we might be sharing real redis or fakeredis depending on conftest.
    # conftest overrides redis.from_url to fake_redis for ALL tests!
    # Even in E2E, if we use Django test client, we have fakeredis.
    # To truly do this, we can just fetch the fakeredis instance and set the TTL manually.
    import fakeredis
    fake = fakeredis.FakeRedis()
    
    with patch("redis.from_url", return_value=fake):
        # Fake redis used in event dispatch view
        
        ev_res1 = client.post("/api/v1/events/", {
            "endpoint_id": endpoint_id,
            "event_type": "test",
            "payload": {},
            "idempotency_key": idem_key
        }, format="json")
        assert ev_res1.status_code == 202
        
        # Override the ttl in fakeredis
        redis_key = f"relay:idem:{tenant_id}:{idem_key}"
        fake.expire(redis_key, 1) # Set to 1 second
        
        time.sleep(2)
        
        ev_res2 = client.post("/api/v1/events/", {
            "endpoint_id": endpoint_id,
            "event_type": "test",
            "payload": {},
            "idempotency_key": idem_key
        }, format="json")
        assert ev_res2.status_code == 202  # Accepted again!
