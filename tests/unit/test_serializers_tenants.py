from unittest.mock import patch, MagicMock
from rest_framework.exceptions import ValidationError
from apps.tenants.serializers import TenantRegisterSerializer

@patch('apps.tenants.models.Tenant.objects.create')
@patch('apps.tenants.models.APIKey.objects.create')
def test_tenant_register_hashes_password(mock_apikey_create, mock_tenant_create):
    serializer = TenantRegisterSerializer(data={
        "name": "Test",
        "email": "test@test.com",
        "password": "plain_password123"
    })
    assert serializer.is_valid()
    
    mock_tenant = MagicMock()
    mock_tenant.id = "mock-uuid"
    mock_tenant_create.return_value = mock_tenant
    
    mock_key = MagicMock()
    mock_key.prefix = "prefix"
    mock_apikey_create.return_value = mock_key

    res = serializer.save()
    
    created_kwargs = mock_tenant_create.call_args[1]
    assert created_kwargs["password_hash"] != "plain_password123"
    assert "plain_password123" not in created_kwargs["password_hash"]
    
    assert res["tenant_id"] == "mock-uuid"
