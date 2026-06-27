from unittest.mock import patch, MagicMock
from rest_framework.exceptions import AuthenticationFailed
from django.test.client import RequestFactory
from apps.core.authentication import APIKeyAuthentication
from tests.factories import RAW_KEY

def test_missing_header_returns_none():
    request = RequestFactory().get("/")
    auth = APIKeyAuthentication()
    assert auth.authenticate(request) is None

@patch("apps.tenants.models.APIKey.objects.select_related")
def test_invalid_key_raises_auth_failed(mock_qs):
    mock_qs.return_value.get.side_effect = Exception("Does not exist")
    request = RequestFactory().get("/", HTTP_X_RELAY_KEY="rly_live_invalid")
    auth = APIKeyAuthentication()
    
    try:
        auth.authenticate(request)
        assert False, "Should have raised AuthenticationFailed"
    except AuthenticationFailed:
        assert True

@patch("apps.tenants.models.APIKey.objects.select_related")
def test_inactive_key_raises_auth_failed(mock_qs):
    mock_key = MagicMock()
    mock_key.is_active = False
    mock_key.tenant.is_active = True
    mock_qs.return_value.get.return_value = mock_key

    request = RequestFactory().get("/", HTTP_X_RELAY_KEY=RAW_KEY)
    auth = APIKeyAuthentication()
    
    try:
        auth.authenticate(request)
        assert False, "Should have raised AuthenticationFailed"
    except AuthenticationFailed:
        assert True

@patch("apps.tenants.models.APIKey.objects.select_related")
def test_inactive_tenant_raises_auth_failed(mock_qs):
    mock_key = MagicMock()
    mock_key.is_active = True
    mock_key.tenant.is_active = False
    mock_qs.return_value.get.return_value = mock_key

    request = RequestFactory().get("/", HTTP_X_RELAY_KEY=RAW_KEY)
    auth = APIKeyAuthentication()
    
    try:
        auth.authenticate(request)
        assert False, "Should have raised AuthenticationFailed"
    except AuthenticationFailed:
        assert True

@patch("apps.tenants.models.APIKey.objects.select_related")
def test_valid_key_returns_tenant_api_key_tuple(mock_qs):
    mock_key = MagicMock()
    mock_key.is_active = True
    mock_key.tenant.is_active = True
    mock_qs.return_value.get.return_value = mock_key

    request = RequestFactory().get("/", HTTP_X_RELAY_KEY=RAW_KEY)
    auth = APIKeyAuthentication()
    
    tenant, api_key = auth.authenticate(request)
    assert tenant == mock_key.tenant
    assert api_key == mock_key

@patch("apps.tenants.models.APIKey.objects.select_related")
def test_valid_key_updates_last_used_at(mock_qs):
    mock_key = MagicMock()
    mock_key.is_active = True
    mock_key.tenant.is_active = True
    mock_qs.return_value.get.return_value = mock_key

    request = RequestFactory().get("/", HTTP_X_RELAY_KEY=RAW_KEY)
    auth = APIKeyAuthentication()
    
    auth.authenticate(request)
    mock_key.save.assert_called_once_with(update_fields=['last_used_at'])
    assert mock_key.last_used_at is not None
