# Relay — Django Models Specification

All models use UUID primary keys. All timestamps are UTC.

---

## App: `tenants`

```python
class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)  # argon2 via django-argon2
    plan = models.CharField(
        max_length=20,
        choices=[('free', 'Free'), ('pro', 'Pro'), ('scale', 'Scale')],
        default='free'
    )
    delivery_count = models.IntegerField(default=0)  # current month
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenants'
        indexes = [models.Index(fields=['email'])]

    @property
    def delivery_quota(self) -> int:
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
    key_hash = models.CharField(max_length=64, unique=True)   # sha256(raw_key), hex
    prefix = models.CharField(max_length=16)                  # first 16 chars of raw key for display
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'api_keys'
        indexes = [
            models.Index(fields=['key_hash']),
            models.Index(fields=['tenant', 'is_active']),
        ]
```

---

## App: `webhooks`

```python
class WebhookEndpoint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='endpoints')
    url = models.URLField(max_length=2048)
    description = models.CharField(max_length=255, blank=True)
    secret_hash = models.CharField(max_length=64)   # sha256(raw_secret), used for HMAC
    secret_prefix = models.CharField(max_length=16) # shown to tenant for identification
    is_active = models.BooleanField(default=True)
    rate_limit_per_minute = models.IntegerField(default=60)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'webhook_endpoints'
        indexes = [models.Index(fields=['tenant', 'is_active'])]


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
    event_type = models.CharField(max_length=100)   # e.g. "order.created"
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
            models.Index(fields=['created_at']),  # for 90-day retention query
        ]


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
    response_body = models.TextField(null=True, blank=True)  # truncated to 4096 chars
    duration_ms = models.IntegerField(null=True, blank=True)
    error_message = models.CharField(max_length=500, null=True, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'delivery_attempts'
        indexes = [
            models.Index(fields=['event', 'attempt_number']),
            models.Index(fields=['attempted_at']),
        ]
```

---

## App: `billing`

```python
class Subscription(models.Model):
    STATUS_CHOICES = [
        ('created', 'Created'),
        ('authenticated', 'Authenticated'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('halted', 'Halted'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField('tenants.Tenant', on_delete=models.CASCADE, related_name='subscription')
    plan = models.CharField(max_length=20, choices=[('free','Free'),('pro','Pro'),('scale','Scale')])
    razorpay_subscription_id = models.CharField(max_length=100, unique=True)
    razorpay_plan_id = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created')
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'


class PaymentRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='payments')
    razorpay_payment_id = models.CharField(max_length=100, unique=True)
    razorpay_subscription_id = models.CharField(max_length=100)
    amount = models.IntegerField()   # paise (INR × 100)
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(max_length=50)
    captured_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_records'
        indexes = [models.Index(fields=['tenant', 'captured_at'])]
```
