import redis as redis_lib
from django.conf import settings
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.core.cache import invalidate
from apps.core.utils import generate_signing_secret
from apps.webhooks.models import DeliveryAttempt, WebhookEndpoint, WebhookEvent


idempotency_redis = redis_lib.Redis.from_url(
    settings.IDEMPOTENCY_REDIS_URL, decode_responses=True
)


class EndpointSerializer(serializers.ModelSerializer):
    signing_secret = serializers.CharField(read_only=True, required=False)

    class Meta:
        model = WebhookEndpoint
        fields = [
            'id', 'url', 'description', 'secret_prefix', 'is_active',
            'rate_limit_per_minute', 'created_at', 'updated_at', 'signing_secret',
        ]
        read_only_fields = ['id', 'secret_prefix', 'is_active', 'created_at', 'updated_at']

    def create(self, validated_data):
        tenant = self.context['request'].user
        raw_secret, secret_hash, prefix = generate_signing_secret()
        endpoint = WebhookEndpoint.objects.create(
            tenant=tenant,
            secret_hash=secret_hash,
            secret_prefix=prefix,
            **validated_data,
        )
        invalidate(f'relay:cache:endpoints:{tenant.id}')
        endpoint._raw_secret = raw_secret
        return endpoint

    def update(self, instance, validated_data):
        validated_data.pop('url', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        invalidate(
            f'relay:cache:endpoints:{instance.tenant_id}',
            f'relay:cache:endpoint:{instance.id}',
        )
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop('signing_secret', None)
        if hasattr(instance, '_raw_secret'):
            data['signing_secret'] = instance._raw_secret
        return data


class EndpointListSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = [
            'id', 'url', 'description', 'secret_prefix', 'is_active',
            'rate_limit_per_minute', 'created_at',
        ]


class EventDispatchSerializer(serializers.Serializer):
    endpoint_id = serializers.UUIDField()
    event_type = serializers.CharField(max_length=100)
    payload = serializers.JSONField()
    idempotency_key = serializers.CharField(max_length=255)

    def validate(self, attrs):
        request = self.context['request']
        tenant = request.user

        try:
            endpoint = WebhookEndpoint.objects.get(
                id=attrs['endpoint_id'], tenant=tenant, is_active=True
            )
        except WebhookEndpoint.DoesNotExist:
            raise ValidationError({'endpoint_id': 'Endpoint not found or inactive.'}, code='not_found')

        idem_key = f"relay:idem:{tenant.id}:{attrs['idempotency_key']}"
        if idempotency_redis.get(idem_key):
            raise ValidationError(
                {'idempotency_key': 'Duplicate event within 24h.'},
                code='conflict',
            )

        tenant.refresh_from_db(fields=['delivery_count'])
        if tenant.quota_exceeded:
            raise ValidationError(
                {'quota': 'Monthly delivery quota exceeded.'},
                code='payment_required',
            )

        attrs['endpoint'] = endpoint
        attrs['tenant'] = tenant
        return attrs

    def create(self, validated_data):
        from apps.webhooks.tasks import dispatch_webhook

        tenant = validated_data['tenant']
        endpoint = validated_data['endpoint']

        event = WebhookEvent.objects.create(
            tenant=tenant,
            endpoint=endpoint,
            event_type=validated_data['event_type'],
            payload=validated_data['payload'],
            idempotency_key=validated_data['idempotency_key'],
            status=WebhookEvent.STATUS_PENDING,
        )

        idem_key = f"relay:idem:{tenant.id}:{validated_data['idempotency_key']}"
        idempotency_redis.set(idem_key, str(event.id), ex=86400)

        dispatch_webhook.delay(str(event.id), attempt_number=1)
        return event

    def to_representation(self, instance):
        return {
            'event_id': str(instance.id),
            'status': instance.status,
            'queued_at': instance.created_at.isoformat() if instance.created_at else None,
        }


class EventListSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEvent
        fields = [
            'id', 'endpoint', 'event_type', 'status', 'attempt_count',
            'created_at', 'delivered_at',
        ]


class EventDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEvent
        fields = [
            'id', 'endpoint', 'event_type', 'payload', 'idempotency_key',
            'status', 'attempt_count', 'created_at', 'delivered_at',
        ]


class DeliveryAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAttempt
        fields = [
            'id', 'attempt_number', 'status', 'http_status_code',
            'response_body', 'duration_ms', 'error_message', 'attempted_at',
        ]
