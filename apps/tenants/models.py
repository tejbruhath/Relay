import uuid

from django.db import models


class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    plan = models.CharField(
        max_length=20,
        choices=[('free', 'Free'), ('pro', 'Pro'), ('scale', 'Scale')],
        default='free',
    )
    delivery_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenants'
        indexes = [models.Index(fields=['email'])]

    def __str__(self):
        return self.name

    @property
    def is_authenticated(self):
        return True

    @property
    def delivery_quota(self):
        return {'free': 1000, 'pro': 50000, 'scale': None}[self.plan]

    @property
    def quota_exceeded(self) -> bool:
        if self.delivery_quota is None:
            return False
        return self.delivery_count >= self.delivery_quota


class APIKey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100)
    key_hash = models.CharField(max_length=64, unique=True)
    prefix = models.CharField(max_length=16)
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_keys'
        indexes = [
            models.Index(fields=['key_hash']),
            models.Index(fields=['tenant', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.prefix}...)"
