import pytest
import respx
import httpx
import time
from uuid import uuid4

pytestmark = [pytest.mark.e2e, pytest.mark.django_db]

API_BASE = "http://localhost:8000/api/v1"
MOCK_TARGET_URL = "http://mock-target.internal/webhook"

def _poll_until_status(client, event_id, target_status, timeout=30):
    start = time.time()
    url = f"/api/v1/events/{event_id}/"
    while time.time() - start < timeout:
        res = client.get(url)
        assert res.status_code == 200
        if res.json()["status"] == target_status:
            return res.json()
        time.sleep(1)
    pytest.fail(f"Event {event_id} did not reach {target_status} within {timeout}s")

@respx.mock
def test_full_delivery_flow(client):
    # 1. Register tenant
    register_res = client.post("/api/v1/auth/register/", {
        "name": f"E2E Tenant {uuid4()}",
        "email": f"e2e_{uuid4()}@test.com",
        "password": "strongpassword123"
    }, format="json")
    assert register_res.status_code == 201
    api_key = register_res.json()["api_key"]
    
    # Use API Key
    client.credentials(HTTP_X_RELAY_KEY=api_key)
    
    # 2. Create endpoint
    ep_res = client.post("/api/v1/endpoints/", {
        "url": MOCK_TARGET_URL,
        "description": "E2E Endpoint",
        "rate_limit_per_minute": 1000
    }, format="json")
    assert ep_res.status_code == 201
    endpoint_id = ep_res.json()["id"]
    
    # Setup respx mock for the external webhook target
    mock_route = respx.post(MOCK_TARGET_URL).mock(return_value=httpx.Response(200, text="OK"))
    
    # 3. Dispatch event
    ev_res = client.post("/api/v1/events/", {
        "endpoint_id": endpoint_id,
        "event_type": "user.created",
        "payload": {"hello": "world"},
        "idempotency_key": str(uuid4())
    }, format="json")
    assert ev_res.status_code == 202
    event_id = ev_res.json()["event_id"]
    
    # 4. Poll GET /events/{id}/ until status != "pending"
    event_data = _poll_until_status(client, event_id, "delivered")
    
    # 5. Assert status == "delivered"
    assert event_data["status"] == "delivered"
    
    # 6. GET /events/{id}/attempts/
    att_res = client.get(f"/api/v1/events/{event_id}/attempts/")
    assert att_res.status_code == 200
    attempts = att_res.json()["results"]
    assert len(attempts) == 1
    assert attempts[0]["status"] == "success"
    
    # 7. GET /usage/
    usage_res = client.get("/api/v1/usage/")
    assert usage_res.status_code == 200
    assert usage_res.json()["delivery_count"] == 1

@respx.mock
def test_multiple_events_sequential(client):
    register_res = client.post("/api/v1/auth/register/", {
        "name": f"E2E Tenant {uuid4()}",
        "email": f"e2e_{uuid4()}@test.com",
        "password": "strongpassword123"
    }, format="json")
    api_key = register_res.json()["api_key"]
    client.credentials(HTTP_X_RELAY_KEY=api_key)
    
    ep_res = client.post("/api/v1/endpoints/", {
        "url": MOCK_TARGET_URL,
        "rate_limit_per_minute": 1000
    }, format="json")
    endpoint_id = ep_res.json()["id"]
    
    respx.post(MOCK_TARGET_URL).mock(return_value=httpx.Response(200, text="OK"))
    
    event_ids = []
    for _ in range(5):
        ev_res = client.post("/api/v1/events/", {
            "endpoint_id": endpoint_id,
            "event_type": "test",
            "payload": {},
            "idempotency_key": str(uuid4())
        }, format="json")
        event_ids.append(ev_res.json()["event_id"])
        
    for eid in event_ids:
        _poll_until_status(client, eid, "delivered")
        
    usage_res = client.get("/api/v1/usage/")
    assert usage_res.json()["delivery_count"] == 5

@respx.mock
def test_endpoint_receives_correct_hmac_headers(client):
    register_res = client.post("/api/v1/auth/register/", {
        "name": f"E2E Tenant {uuid4()}",
        "email": f"e2e_{uuid4()}@test.com",
        "password": "strongpassword123"
    }, format="json")
    api_key = register_res.json()["api_key"]
    client.credentials(HTTP_X_RELAY_KEY=api_key)
    
    ep_res = client.post("/api/v1/endpoints/", {
        "url": MOCK_TARGET_URL,
        "rate_limit_per_minute": 1000
    }, format="json")
    endpoint_id = ep_res.json()["id"]
    
    mock_route = respx.post(MOCK_TARGET_URL).mock(return_value=httpx.Response(200, text="OK"))
    
    ev_res = client.post("/api/v1/events/", {
        "endpoint_id": endpoint_id,
        "event_type": "header.test",
        "payload": {},
        "idempotency_key": str(uuid4())
    }, format="json")
    event_id = ev_res.json()["event_id"]
    
    _poll_until_status(client, event_id, "delivered")
    
    assert mock_route.called
    request = mock_route.calls[0].request
    
    assert "X-Relay-Signature" in request.headers
    assert request.headers["X-Relay-Signature"].startswith("sha256=")
    assert request.headers["X-Relay-Event-ID"] == event_id
