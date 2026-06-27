import pytest
from unittest.mock import patch, MagicMock
from rest_framework.exceptions import ValidationError
from apps.webhooks.serializers import EventDispatchSerializer, EndpointSerializer
from apps.tenants.models import Tenant

def test_event_dispatch_rejects_wrong_tenant_endpoint():
    request = MagicMock()
    request.tenant = Tenant(id="tenant-1")
    
    mock_endpoint = MagicMock()
    mock_endpoint.tenant_id = "tenant-2"
    mock_endpoint.is_active = True
    
    serializer = EventDispatchSerializer(
        data={"endpoint_id": "endpoint-1", "event_type": "test", "payload": {}, "idempotency_key": "123"},
        context={"request": request}
    )
    assert serializer.is_valid()
    
    with patch("apps.webhooks.models.WebhookEndpoint.objects.filter") as mock_filter:
        mock_filter.return_value.first.return_value = mock_endpoint
        
        try:
            serializer.create(serializer.validated_data)
            assert False, "Should raise ValidationError"
        except ValidationError as e:
            assert e.status_code == 404

def test_event_dispatch_rejects_inactive_endpoint():
    request = MagicMock()
    request.tenant = Tenant(id="tenant-1")
    
    mock_endpoint = MagicMock()
    mock_endpoint.tenant_id = "tenant-1"
    mock_endpoint.is_active = False
    
    serializer = EventDispatchSerializer(
        data={"endpoint_id": "endpoint-1", "event_type": "test", "payload": {}, "idempotency_key": "123"},
        context={"request": request}
    )
    assert serializer.is_valid()
    
    with patch("apps.webhooks.models.WebhookEndpoint.objects.filter") as mock_filter:
        mock_filter.return_value.first.return_value = mock_endpoint
        
        try:
            serializer.create(serializer.validated_data)
            assert False, "Should raise ValidationError"
        except ValidationError as e:
            assert e.status_code == 404

def test_event_dispatch_rejects_quota_exceeded():
    request = MagicMock()
    request.tenant = Tenant(id="tenant-1", plan="free", delivery_count=1000)
    
    mock_endpoint = MagicMock()
    mock_endpoint.tenant_id = "tenant-1"
    mock_endpoint.is_active = True
    
    serializer = EventDispatchSerializer(
        data={"endpoint_id": "endpoint-1", "event_type": "test", "payload": {}, "idempotency_key": "123"},
        context={"request": request}
    )
    assert serializer.is_valid()
    
    with patch("apps.webhooks.models.WebhookEndpoint.objects.filter") as mock_filter:
        mock_filter.return_value.first.return_value = mock_endpoint
        
        try:
            serializer.create(serializer.validated_data)
            assert False, "Should raise ValidationError"
        except ValidationError as e:
            assert e.status_code == 402

@patch("redis.Redis")
def test_event_dispatch_rejects_duplicate_idempotency(mock_redis_class):
    request = MagicMock()
    request.tenant = Tenant(id="tenant-1", plan="free", delivery_count=0)
    
    mock_endpoint = MagicMock()
    mock_endpoint.tenant_id = "tenant-1"
    mock_endpoint.is_active = True
    
    # Fake redis setnx returns False (key exists)
    mock_redis_inst = MagicMock()
    mock_redis_inst.setnx.return_value = False
    mock_redis_class.return_value = mock_redis_inst
    
    serializer = EventDispatchSerializer(
        data={"endpoint_id": "endpoint-1", "event_type": "test", "payload": {}, "idempotency_key": "123"},
        context={"request": request}
    )
    assert serializer.is_valid()
    
    with patch("apps.webhooks.models.WebhookEndpoint.objects.filter") as mock_filter:
        mock_filter.return_value.first.return_value = mock_endpoint
        
        try:
            serializer.create(serializer.validated_data)
            assert False, "Should raise ValidationError"
        except ValidationError as e:
            assert e.status_code == 409

@patch("apps.webhooks.models.WebhookEndpoint.objects.create")
def test_endpoint_serializer_generates_secret_on_create(mock_create):
    request = MagicMock()
    request.tenant = Tenant(id="tenant-1")
    
    mock_ep = MagicMock()
    mock_create.return_value = mock_ep
    
    serializer = EndpointSerializer(
        data={"url": "https://example.com/webhook", "rate_limit_per_minute": 60},
        context={"request": request}
    )
    assert serializer.is_valid()
    
    res = serializer.save()
    
    created_kwargs = mock_create.call_args[1]
    assert "secret_hash" in created_kwargs
    assert "secret_prefix" in created_kwargs
    assert getattr(res, "signing_secret", None) is not None
    assert res.signing_secret.startswith("whsec_")
