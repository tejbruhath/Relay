import uuid

from django.db import models


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
    plan = models.CharField(max_length=20, choices=[('free', 'Free'), ('pro', 'Pro'), ('scale', 'Scale')])
    razorpay_subscription_id = models.CharField(max_length=100, unique=True)
    razorpay_plan_id = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created')
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'

    def __str__(self):
        return f"{self.tenant.name} — {self.plan} ({self.status})"


class PaymentRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='payments')
    razorpay_payment_id = models.CharField(max_length=100, unique=True)
    razorpay_subscription_id = models.CharField(max_length=100)
    amount = models.IntegerField()
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(max_length=50)
    captured_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_records'
        indexes = [models.Index(fields=['tenant', 'captured_at'])]

    def __str__(self):
        return f"₹{self.amount / 100:.2f} — {self.tenant.name}"
