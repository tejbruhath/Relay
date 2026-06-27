import hashlib
import hmac
import random
import secrets


def generate_api_key() -> tuple[str, str, str]:
    raw = f"rly_live_{secrets.token_hex(32)}"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[:16]
    return raw, key_hash, prefix


def generate_signing_secret() -> tuple[str, str, str]:
    raw = f"whsec_{secrets.token_hex(32)}"
    secret_hash = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[:16]
    return raw, secret_hash, prefix


def compute_hmac_signature(raw_secret: str, timestamp: int, payload_json: str) -> str:
    message = f"{timestamp}.{payload_json}".encode()
    sig = hmac.new(raw_secret.encode(), message, hashlib.sha256)
    return f"sha256={sig.hexdigest()}"


def backoff_delay(attempt: int) -> float:
    base = 30
    cap = 7200
    exp = min(cap, base * (2 ** (attempt - 1)))
    return random.uniform(0, exp)
