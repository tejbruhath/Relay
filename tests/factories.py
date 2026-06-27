import factory
from django.utils import timezone
from apps.tenants.models import Tenant, APIKey
from apps.webhooks.models import WebhookEndpoint, WebhookEvent, DeliveryAttempt
from apps.billing.models import Subscription
import hashlib

class TenantFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Tenant

    name = factory.Faker('company')
    email = factory.Faker('email')
    plan = 'free'
    delivery_count = 0


class APIKeyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = APIKey

    tenant = factory.SubFactory(TenantFactory)
    name = 'Test Key'
    # We must match the app's hash generation pattern. 
    # API key generation in core.utils returns raw_key and key_hash.
    # The key_hash is sha256(raw_key).
    # Since tests need to pass auth, the fixture logic in conftest will set the raw key.
    # This factory just sets dummy data that will be overridden.
    key_hash = factory.Sequence(lambda n: hashlib.sha256(f"dummy_{n}".encode()).hexdigest())
    prefix = 'rly_live_test'


class WebhookEndpointFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = WebhookEndpoint

    tenant = factory.SubFactory(TenantFactory)
    url = factory.Faker('url')
    description = 'Test Endpoint'
    secret_hash = factory.Sequence(lambda n: hashlib.sha256(f"secret_{n}".encode()).hexdigest())
    secret_prefix = 'whsec_test'


class WebhookEventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = WebhookEvent

    tenant = factory.SubFactory(TenantFactory)
    endpoint = factory.SubFactory(WebhookEndpointFactory)
    event_type = 'test.event'
    payload = {'foo': 'bar'}
    idempotency_key = factory.Sequence(lambda n: f"idem_{n}")
    status = WebhookEvent.STATUS_PENDING


class DeliveryAttemptFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DeliveryAttempt

    event = factory.SubFactory(WebhookEventFactory)
    attempt_number = 1
    status = DeliveryAttempt.STATUS_SUCCESS
    http_status_code = 200
    duration_ms = 100


class SubscriptionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Subscription

    tenant = factory.SubFactory(TenantFactory)
    plan = 'pro'
    razorpay_subscription_id = factory.Sequence(lambda n: f"sub_{n}")
    razorpay_plan_id = 'plan_test'
    status = 'active'
    current_period_start = factory.LazyFunction(timezone.now)
    current_period_end = factory.LazyFunction(lambda: timezone.now() + timezone.timedelta(days=30))
