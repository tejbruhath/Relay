import pytest
import respx
import httpx
import time
from uuid import uuid4

pytestmark = [pytest.mark.e2e, pytest.mark.django_db]

MOCK_TARGET_URL = "http://mock-target.internal/webhook"

def _setup_tenant_and_endpoint(client):
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
    return ep_res.json()["id"]

def _poll_until_status(client, event_id, target_status, timeout=120):
    start = time.time()
    url = f"/api/v1/events/{event_id}/"
    while time.time() - start < timeout:
        res = client.get(url)
        assert res.status_code == 200
        if res.json()["status"] == target_status:
            return res.json()
        time.sleep(2)
    pytest.fail(f"Event {event_id} did not reach {target_status} within {timeout}s")

@respx.mock
def test_retry_on_500_response(client):
    endpoint_id = _setup_tenant_and_endpoint(client)
    
    # Mock endpoint returns 500 for first 2 attempts, then 200
    call_count = {"count": 0}
    def side_effect(request):
        call_count["count"] += 1
        if call_count["count"] <= 2:
            return httpx.Response(500, text="Error")
        return httpx.Response(200, text="OK")
        
    respx.post(MOCK_TARGET_URL).mock(side_effect=side_effect)
    
    ev_res = client.post("/api/v1/events/", {
        "endpoint_id": endpoint_id,
        "event_type": "test",
        "payload": {},
        "idempotency_key": str(uuid4())
    }, format="json")
    event_id = ev_res.json()["event_id"]
    
    # Will backoff initially up to ~1-2 seconds per formula, poll waits
    _poll_until_status(client, event_id, "delivered")
    
    att_res = client.get(f"/api/v1/events/{event_id}/attempts/")
    attempts = att_res.json()["results"]
    assert len(attempts) == 3
    # Ordered newest first usually
    assert attempts[-1]["status"] == "failure"  # Attempt 1
    assert attempts[-2]["status"] == "failure"  # Attempt 2
    assert attempts[0]["status"] == "success"   # Attempt 3

@respx.mock
def test_dead_letter_after_6_failures(client):
    endpoint_id = _setup_tenant_and_endpoint(client)
    
    # Always 500
    respx.post(MOCK_TARGET_URL).mock(return_value=httpx.Response(500, text="Error"))
    
    ev_res = client.post("/api/v1/events/", {
        "endpoint_id": endpoint_id,
        "event_type": "test",
        "payload": {},
        "idempotency_key": str(uuid4())
    }, format="json")
    event_id = ev_res.json()["event_id"]
    
    # Poll until dead (max 6 attempts, base backoff might be fast in testing or delayed)
    # We must patch celery backoff delay to be 0 for this test or we wait a long time.
    # In live E2E, this might take minutes. We will override backoff_delay.
    
    from unittest.mock import patch
    with patch("apps.core.utils.backoff_delay", return_value=0):
        _poll_until_status(client, event_id, "dead", timeout=20)
        
    att_res = client.get(f"/api/v1/events/{event_id}/attempts/")
    attempts = att_res.json()["results"]
    assert len(attempts) == 6
    for attempt in attempts:
        assert attempt["status"] == "failure"

@respx.mock
def test_timeout_treated_as_failure(client):
    endpoint_id = _setup_tenant_and_endpoint(client)
    
    # Respx mock delay raises Timeout
    def side_effect(request):
        raise httpx.TimeoutException("Timeout")
    
    respx.post(MOCK_TARGET_URL).mock(side_effect=side_effect)
    
    ev_res = client.post("/api/v1/events/", {
        "endpoint_id": endpoint_id,
        "event_type": "test",
        "payload": {},
        "idempotency_key": str(uuid4())
    }, format="json")
    event_id = ev_res.json()["event_id"]
    
    from unittest.mock import patch
    with patch("apps.core.utils.backoff_delay", return_value=0):
        _poll_until_status(client, event_id, "dead", timeout=20)
        
    att_res = client.get(f"/api/v1/events/{event_id}/attempts/")
    attempts = att_res.json()["results"]
    assert len(attempts) == 6
    assert attempts[0]["status"] == "timeout"
