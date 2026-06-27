import hashlib
import pytest
from apps.core.utils import (
    backoff_delay,
    compute_hmac_signature,
    generate_api_key,
    generate_signing_secret,
)


def test_generate_api_key():
    raw_key, key_hash, prefix = generate_api_key()
    assert raw_key.startswith('rly_live_')
    assert prefix == raw_key[:16]
    # Verify the hash matches what we expect
    expected_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    assert key_hash == expected_hash


def test_generate_signing_secret():
    raw_secret, secret_hash, prefix = generate_signing_secret()
    assert raw_secret.startswith('whsec_')
    assert prefix == raw_secret[:16]
    expected_hash = hashlib.sha256(raw_secret.encode()).hexdigest()
    assert secret_hash == expected_hash


def test_compute_hmac_signature():
    secret_hash = "some_secret_hash"
    timestamp = 1620000000
    payload_json = '{"test":"payload"}'
    
    signature = compute_hmac_signature(secret_hash, timestamp, payload_json)
    assert signature.startswith("sha256=")
    
    # Deterministic behavior
    signature2 = compute_hmac_signature(secret_hash, timestamp, payload_json)
    assert signature == signature2
    
    # Payload changes
    signature3 = compute_hmac_signature(secret_hash, timestamp, '{"test":"different"}')
    assert signature != signature3
    
    # Timestamp changes
    signature4 = compute_hmac_signature(secret_hash, 1620000001, payload_json)
    assert signature != signature4


def test_backoff_delay():
    # Attempt 1
    delay1 = backoff_delay(1)
    assert 0 <= delay1 <= 30

    # Attempt 5
    delay5 = backoff_delay(5)
    assert 0 <= delay5 <= 7200

    # Check that it's capped
    delay10 = backoff_delay(10)
    assert 0 <= delay10 <= 7200
