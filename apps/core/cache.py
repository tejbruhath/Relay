from django.core.cache import cache


def cache_aside(key: str, fetch_fn, ttl: int):
    cached = cache.get(key)
    if cached is not None:
        return cached
    result = fetch_fn()
    cache.set(key, result, ttl)
    return result


def invalidate(*keys: str):
    for key in keys:
        cache.delete(key)
