import pytest
import fakeredis
from django.test import override_settings
from unittest.mock import patch
from django.core.cache import cache

# Import all fixtures
from tests.fixtures import *  # noqa

# Override cache to locmem for all tests
@pytest.fixture(autouse=True)
def use_locmem_cache(settings):
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }

# Clear cache between tests to prevent bleed
@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()

# Override Redis for idempotency + rate limiting to fakeredis
@pytest.fixture(autouse=True)
def fake_redis(monkeypatch):
    server = fakeredis.FakeServer()
    fake = fakeredis.FakeRedis(server=server, version=(6, 2)) # Need version > 6.2 for XADD
    monkeypatch.setattr("redis.Redis", lambda **kwargs: fake)
    monkeypatch.setattr("redis.from_url", lambda url, **kwargs: fake)
    return fake

# E2E marker: skip unless --e2e passed
def pytest_addoption(parser):
    parser.addoption("--e2e", action="store_true", default=False,
                     help="Run E2E tests against live Docker stack")

def pytest_collection_modifyitems(config, items):
    if not config.getoption("--e2e"):
        skip_e2e = pytest.mark.skip(reason="Pass --e2e to run")
        for item in items:
            if "e2e" in item.keywords:
                item.add_marker(skip_e2e)
