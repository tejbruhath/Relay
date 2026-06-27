from django.contrib.auth.hashers import make_password, check_password
from rest_framework import serializers

from apps.core.cache import cache_aside, invalidate
from apps.core.utils import generate_api_key
from apps.tenants.models import APIKey, Tenant


class TenantRegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if Tenant.objects.filter(email=value).exists():
            raise serializers.ValidationError('A tenant with this email already exists.')
        return value

    def create(self, validated_data):
        password_hash = make_password(validated_data['password'])
        tenant = Tenant.objects.create(
            name=validated_data['name'],
            email=validated_data['email'],
            password_hash=password_hash,
        )
        raw_key, key_hash, prefix = generate_api_key()
        APIKey.objects.create(
            tenant=tenant,
            name='Default',
            key_hash=key_hash,
            prefix=prefix,
        )
        return {'tenant': tenant, 'raw_key': raw_key, 'prefix': prefix}

    def to_representation(self, instance):
        tenant = instance['tenant']
        return {
            'tenant_id': str(tenant.id),
            'email': tenant.email,
            'api_key': instance['raw_key'],
            'api_key_prefix': instance['prefix'],
        }


class TenantLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        try:
            tenant = Tenant.objects.get(email=attrs['email'], is_active=True)
        except Tenant.DoesNotExist:
            raise serializers.ValidationError('Invalid email or password.')
        if not check_password(attrs['password'], tenant.password_hash):
            raise serializers.ValidationError('Invalid email or password.')
        attrs['tenant'] = tenant
        return attrs

    def to_representation(self, validated_data):
        tenant = validated_data['tenant']
        return {
            'tenant_id': str(tenant.id),
            'email': tenant.email,
            'plan': tenant.plan,
        }


class APIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = ['id', 'name', 'prefix', 'is_active', 'last_used_at', 'created_at']
        read_only_fields = ['id', 'prefix', 'is_active', 'last_used_at', 'created_at']

    def create(self, validated_data):
        tenant = self.context['request'].user
        raw_key, key_hash, prefix = generate_api_key()
        api_key = APIKey.objects.create(
            tenant=tenant,
            name=validated_data['name'],
            key_hash=key_hash,
            prefix=prefix,
        )
        invalidate(f'relay:cache:apikeys:{tenant.id}')
        api_key._raw_key = raw_key
        return api_key

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if hasattr(instance, '_raw_key'):
            data['api_key'] = instance._raw_key
        return data


class APIKeyListSerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = ['id', 'name', 'prefix', 'is_active', 'last_used_at', 'created_at']


class TenantProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'email', 'plan', 'delivery_count', 'is_active', 'created_at']


class UsageSerializer(serializers.Serializer):
    plan = serializers.CharField()
    delivery_count = serializers.IntegerField()
    delivery_quota = serializers.IntegerField(allow_null=True)
    quota_exceeded = serializers.BooleanField()
