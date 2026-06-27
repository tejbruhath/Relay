from unittest.mock import MagicMock
from django.core.cache import cache
from apps.core.cache import cache_aside, invalidate

def test_cache_aside_miss_calls_fetch_fn():
    mock_fetch = MagicMock(return_value="data")
    result = cache_aside("test_key_1", mock_fetch, 60)
    
    assert result == "data"
    mock_fetch.assert_called_once()

def test_cache_aside_hit_skips_fetch_fn():
    cache.set("test_key_2", "cached_data", 60)
    
    mock_fetch = MagicMock(return_value="new_data")
    result = cache_aside("test_key_2", mock_fetch, 60)
    
    assert result == "cached_data"
    mock_fetch.assert_not_called()

def test_cache_aside_stores_result():
    mock_fetch = MagicMock(return_value="data")
    cache_aside("test_key_3", mock_fetch, 60)
    
    result = cache.get("test_key_3")
    assert result == "data"
    
    # Second call is hit
    mock_fetch_2 = MagicMock()
    cache_aside("test_key_3", mock_fetch_2, 60)
    mock_fetch_2.assert_not_called()

def test_invalidate_clears_key():
    cache.set("test_key_4", "data", 60)
    invalidate("test_key_4")
    assert cache.get("test_key_4") is None

def test_invalidate_multiple_keys():
    cache.set("key_a", "1", 60)
    cache.set("key_b", "2", 60)
    cache.set("key_c", "3", 60)
    
    invalidate("key_a", "key_b", "key_c")
    
    assert cache.get("key_a") is None
    assert cache.get("key_b") is None
    assert cache.get("key_c") is None
