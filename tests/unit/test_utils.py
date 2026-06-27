import hashlib
from apps.core.utils import (
    generate_api_key, generate_signing_secret,
    compute_hmac_signature, backoff_delay
)

def test_generate_api_key_format():
    raw, h, prefix = generate_api_key()
    assert raw.startswith("rly_live_")
    assert h == hashlib.sha256(raw.encode()).hexdigest()
    assert prefix == raw[:16]
    assert len(h) == 64

def test_generate_api_key_uniqueness():
    raw1, _, _ = generate_api_key()
    raw2, _, _ = generate_api_key()
    assert raw1 != raw2

def test_generate_signing_secret_format():
    raw, h, prefix = generate_signing_secret()
    assert raw.startswith("whsec_")
    assert h == hashlib.sha256(raw.encode()).hexdigest()
    assert prefix == raw[:12]

def test_compute_hmac_signature_format():
    sig = compute_hmac_signature("test_secret", "1234567890", '{"test": 1}')
    assert sig.startswith("sha256=")
    assert len(sig.split("=")[1]) == 64

def test_compute_hmac_signature_deterministic():
    sig1 = compute_hmac_signature("test_secret", "1234567890", '{"test": 1}')
    sig2 = compute_hmac_signature("test_secret", "1234567890", '{"test": 1}')
    assert sig1 == sig2

def test_compute_hmac_signature_changes_with_timestamp():
    sig1 = compute_hmac_signature("test_secret", "1", '{"test": 1}')
    sig2 = compute_hmac_signature("test_secret", "2", '{"test": 1}')
    assert sig1 != sig2

def test_compute_hmac_signature_changes_with_payload():
    sig1 = compute_hmac_signature("test_secret", "1234567890", "a")
    sig2 = compute_hmac_signature("test_secret", "1234567890", "b")
    assert sig1 != sig2

def test_backoff_delay_attempt_1_range():
    delay = backoff_delay(1)
    assert 0 <= delay <= 30

def test_backoff_delay_attempt_5_within_cap():
    delay = backoff_delay(5)
    assert 0 <= delay <= 7200

def test_backoff_delay_always_non_negative():
    for _ in range(1000):
        assert backoff_delay(1) >= 0

def test_backoff_delay_cap_respected():
    delay = backoff_delay(20)
    assert delay <= 7200
