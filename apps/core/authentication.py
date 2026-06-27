import hashlib

from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.tenants.models import APIKey


class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        raw_key = request.headers.get('X-Relay-Key')
        if not raw_key:
            return None
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        try:
            api_key = APIKey.objects.select_related('tenant').get(
                key_hash=key_hash, is_active=True, tenant__is_active=True
            )
        except APIKey.DoesNotExist:
            raise AuthenticationFailed('Invalid or inactive API key.')
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])
        return (api_key.tenant, api_key)

    def authenticate_header(self, request):
        return 'APIKey'
