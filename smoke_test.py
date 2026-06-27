#!/usr/bin/env python3
"""
Relay smoke test — runs against localhost:8000.
Tests the full happy path: register → create endpoint → dispatch event → poll delivery.

Usage:
    pip install httpx
    python smoke_test.py
"""

import httpx
import time
import sys
import json

BASE_URL = "http://localhost:8000/api/v1"
HEADERS = {"Content-Type": "application/json"}

# A local echo server to receive webhooks. Use https://webhook.site for real testing.
# For local: spin up `python -m http.server 9000` or use ngrok.
TEST_ENDPOINT_URL = "https://httpbin.org/status/200"

def ok(label: str, res: httpx.Response, expected_status: int):
    if res.status_code != expected_status:
        print(f"  ✗ {label} — expected {expected_status}, got {res.status_code}")
        print(f"    body: {res.text[:300]}")
        sys.exit(1)
    print(f"  ✓ {label} ({res.status_code})")
    if expected_status == 204:
        return None
    return res.json()

def run():
    print("\n── Relay Smoke Test ──\n")

    with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=15) as client:

        # 1. Register tenant
        print("[1] Register tenant")
        data = ok("POST /auth/register/", client.post("/auth/register/", json={
            "name": "Smoke Test Corp",
            "email": f"smoke_{int(time.time())}@test.com",
            "password": "TestPass123!"
        }), 201)
        api_key = data["api_key"]
        tenant_id = data["tenant_id"]
        print(f"    tenant_id: {tenant_id}")
        print(f"    api_key:   {api_key[:20]}...")

        auth = {"X-Relay-Key": api_key}

        # 2. Create webhook endpoint
        print("\n[2] Create webhook endpoint")
        data = ok("POST /endpoints/", client.post("/endpoints/", json={
            "url": TEST_ENDPOINT_URL,
            "description": "Smoke test endpoint",
            "rate_limit_per_minute": 60
        }, headers=auth), 201)
        endpoint_id = data["id"]
        signing_secret = data.get("signing_secret", "")
        print(f"    endpoint_id:    {endpoint_id}")
        print(f"    signing_secret: {signing_secret[:20]}...")

        # 3. List endpoints (tests cache-aside)
        print("\n[3] List endpoints (cache miss → DB, second call → cache)")
        ok("GET /endpoints/ (miss)", client.get("/endpoints/", headers=auth), 200)
        ok("GET /endpoints/ (hit) ", client.get("/endpoints/", headers=auth), 200)

        # 4. Dispatch event
        print("\n[4] Dispatch webhook event")
        idempotency_key = f"smoke-test-{int(time.time())}"
        data = ok("POST /events/", client.post("/events/", json={
            "endpoint_id": endpoint_id,
            "event_type": "order.created",
            "payload": {"order_id": "ORD-001", "amount": 5000, "currency": "INR"},
            "idempotency_key": idempotency_key
        }, headers=auth), 202)
        event_id = data["event_id"]
        print(f"    event_id: {event_id}")

        # 5. Idempotency check (same key = 409)
        print("\n[5] Idempotency — duplicate key should 409")
        ok("POST /events/ (duplicate)", client.post("/events/", json={
            "endpoint_id": endpoint_id,
            "event_type": "order.created",
            "payload": {"order_id": "ORD-001"},
            "idempotency_key": idempotency_key
        }, headers=auth), 409)

        # 6. Poll event status (wait for Celery)
        print("\n[6] Poll event status (waiting for Celery delivery)...")
        delivered = False
        for i in range(10):
            time.sleep(2)
            data = client.get(f"/events/{event_id}/", headers=auth).json()
            status = data.get("status")
            print(f"    attempt {i+1}: status={status}")
            if status in ("delivered", "failed", "dead"):
                delivered = True
                break

        if not delivered:
            print("  ✗ Event not processed within 20s — check Celery worker logs")
            sys.exit(1)

        # 7. Check delivery attempts
        print("\n[7] Delivery attempts")
        data = ok("GET /events/{id}/attempts/", client.get(f"/events/{event_id}/attempts/", headers=auth), 200)
        print(f"    attempts logged: {len(data)}")
        for attempt in data:
            print(f"      #{attempt['attempt_number']}: {attempt['status']} | http={attempt.get('http_status_code')} | {attempt.get('duration_ms')}ms")

        # 8. Usage
        print("\n[8] Usage summary")
        data = ok("GET /usage/", client.get("/usage/", headers=auth), 200)
        print(f"    plan={data['plan']} | count={data['delivery_count']} / {data['delivery_quota']}")

        # 9. Revoke API key
        print("\n[9] Create + revoke a second API key")
        data = ok("POST /api-keys/", client.post("/api-keys/", json={"name": "temp key"}, headers=auth), 201)
        key_id = data["id"]
        ok(f"DELETE /api-keys/{key_id}/", client.delete(f"/api-keys/{key_id}/", headers=auth), 204)

    print("\n── All checks passed ✓ ──\n")

if __name__ == "__main__":
    run()
