import uuid

from django.db import models


class WebhookEndpoint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='endpoints')
    url = models.URLField(max_length=2048)
    description = models.CharField(max_length=255, blank=True)
    secret_hash = models.CharField(max_length=64)
    secret_prefix = models.CharField(max_length=16)
    is_active = models.BooleanField(default=True)
    rate_limit_per_minute = models.IntegerField(default=60)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'webhook_endpoints'
        indexes = [models.Index(fields=['tenant', 'is_active'])]

    def __str__(self):
        return f"{self.url} ({self.tenant.name})"


class WebhookEvent(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_DELIVERED = 'delivered'
    STATUS_FAILED = 'failed'
    STATUS_DEAD = 'dead'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_DELIVERED, 'Delivered'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_DEAD, 'Dead'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='events')
    endpoint = models.ForeignKey(WebhookEndpoint, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    idempotency_key = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    attempt_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'webhook_events'
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['tenant', 'idempotency_key']),
            models.Index(fields=['endpoint', 'created_at']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.event_type} → {self.endpoint.url} ({self.status})"


class DeliveryAttempt(models.Model):
    STATUS_SUCCESS = 'success'
    STATUS_FAILURE = 'failure'
    STATUS_TIMEOUT = 'timeout'
    STATUS_CHOICES = [
        (STATUS_SUCCESS, 'Success'),
        (STATUS_FAILURE, 'Failure'),
        (STATUS_TIMEOUT, 'Timeout'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(WebhookEvent, on_delete=models.CASCADE, related_name='attempts')
    attempt_number = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    http_status_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)
    error_message = models.CharField(max_length=500, null=True, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'delivery_attempts'
        indexes = [
            models.Index(fields=['event', 'attempt_number']),
            models.Index(fields=['attempted_at']),
        ]

    def save(self, *args, **kwargs):
        if self.response_body and len(self.response_body) > 4096:
            self.response_body = self.response_body[:4096]
        super().save(*args, **kwargs)
