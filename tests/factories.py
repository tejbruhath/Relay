import factory
import hashlib
from factory.django import DjangoModelFactory
from apps.tenants.models import Tenant, APIKey
from apps.webhooks.models import WebhookEndpoint, WebhookEvent, DeliveryAttempt
from apps.billing.models import Subscription, PaymentRecord

RAW_KEY = "rly_live_testkey00000000000000000000000000000000000000000000000000"
RAW_SECRET = "whsec_testsecret0000000000000000000000000000000000000000000000"

class TenantFactory(DjangoModelFactory):
    class Meta:
        model = Tenant
    name = factory.Sequence(lambda n: f"Tenant {n}")
    email = factory.Sequence(lambda n: f"tenant{n}@test.com")
    password_hash = "argon2_hashed_password"
    plan = "free"
    delivery_count = 0
    is_active = True

class APIKeyFactory(DjangoModelFactory):
    class Meta:
        model = APIKey
    tenant = factory.SubFactory(TenantFactory)
    name = "Test Key"
    key_hash = hashlib.sha256(RAW_KEY.encode()).hexdigest()
    prefix = RAW_KEY[:16]
    is_active = True
    last_used_at = None

class WebhookEndpointFactory(DjangoModelFactory):
    class Meta:
        model = WebhookEndpoint
    tenant = factory.SubFactory(TenantFactory)
    url = factory.Sequence(lambda n: f"https://example{n}.com/webhook")
    description = "Test endpoint"
    secret_hash = hashlib.sha256(RAW_SECRET.encode()).hexdigest()
    secret_prefix = RAW_SECRET[:12]
    is_active = True
    rate_limit_per_minute = 60

class WebhookEventFactory(DjangoModelFactory):
    class Meta:
        model = WebhookEvent
    tenant = factory.SubFactory(TenantFactory)
    endpoint = factory.SubFactory(WebhookEndpointFactory, tenant=factory.SelfAttribute('..tenant'))
    event_type = "order.created"
    payload = {"order_id": "test-123", "amount": 5000}
    idempotency_key = factory.Sequence(lambda n: f"idem-key-{n}")
    status = "pending"
    attempt_count = 0

class DeliveryAttemptFactory(DjangoModelFactory):
    class Meta:
        model = DeliveryAttempt
    event = factory.SubFactory(WebhookEventFactory)
    attempt_number = 1
    status = "success"
    http_status_code = 200
    response_body = "OK"
    duration_ms = 150
    error_message = None

class SubscriptionFactory(DjangoModelFactory):
    class Meta:
        model = Subscription
    tenant = factory.SubFactory(TenantFactory)
    plan = "pro"
    razorpay_subscription_id = factory.Sequence(lambda n: f"sub_{n:08d}")
    razorpay_plan_id = "plan_test_pro"
    status = "active"
    current_period_start = None
    current_period_end = None

class PaymentRecordFactory(DjangoModelFactory):
    class Meta:
        model = PaymentRecord
    tenant = factory.SubFactory(TenantFactory)
    razorpay_payment_id = factory.Sequence(lambda n: f"pay_{n:08d}")
    razorpay_subscription_id = factory.Sequence(lambda n: f"sub_{n:08d}")
    amount = 5000
    currency = "INR"
    status = "captured"
    captured_at = None
