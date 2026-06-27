import pytest
from unittest.mock import patch
from rest_framework.test import APIClient
from apps.billing.models import Subscription, PaymentRecord

pytestmark = pytest.mark.django_db


@patch('apps.billing.razorpay_client.create_subscription')
def test_create_subscription_success(mock_create_sub, auth_headers, tenant):
    mock_create_sub.return_value = {
        'id': 'sub_test_123',
        'status': 'created'
    }

    client = APIClient()
    response = client.post('/api/v1/billing/create-subscription/', {
        'plan': 'pro'
    }, format='json', **auth_headers)

    assert response.status_code == 201
    assert response.data['subscription_id'] == 'sub_test_123'
    assert response.data['plan'] == 'pro'

    sub = Subscription.objects.get(tenant=tenant)
    assert sub.razorpay_subscription_id == 'sub_test_123'
    assert sub.plan == 'pro'


@patch('apps.billing.razorpay_client.verify_webhook_signature')
def test_webhook_invalid_signature(mock_verify):
    mock_verify.return_value = False

    client = APIClient()
    response = client.post('/api/v1/billing/webhook/', {
        'event': 'subscription.activated',
        'payload': {}
    }, format='json', HTTP_X_RAZORPAY_SIGNATURE='invalid')

    assert response.status_code == 400


@patch('apps.billing.razorpay_client.verify_webhook_signature')
def test_webhook_subscription_activated(mock_verify, tenant):
    mock_verify.return_value = True

    from tests.factories import SubscriptionFactory
    sub = SubscriptionFactory(tenant=tenant, status='created')

    client = APIClient()
    response = client.post('/api/v1/billing/webhook/', {
        'event': 'subscription.activated',
        'payload': {
            'subscription': {
                'entity': {
                    'id': sub.razorpay_subscription_id,
                    'current_start': 1620000000,
                    'current_end': 1622592000
                }
            }
        }
    }, format='json', HTTP_X_RAZORPAY_SIGNATURE='valid')

    assert response.status_code == 200
    
    sub.refresh_from_db()
    assert sub.status == 'active'
    
    tenant.refresh_from_db()
    assert tenant.plan == sub.plan


@patch('apps.billing.razorpay_client.verify_webhook_signature')
def test_webhook_payment_captured(mock_verify, tenant):
    mock_verify.return_value = True

    from tests.factories import SubscriptionFactory
    sub = SubscriptionFactory(tenant=tenant, status='active')
    tenant.delivery_count = 500
    tenant.save()

    client = APIClient()
    response = client.post('/api/v1/billing/webhook/', {
        'event': 'payment.captured',
        'payload': {
            'payment': {
                'entity': {
                    'id': 'pay_123',
                    'subscription_id': sub.razorpay_subscription_id,
                    'amount': 99900,
                    'currency': 'INR',
                    'status': 'captured'
                }
            }
        }
    }, format='json', HTTP_X_RAZORPAY_SIGNATURE='valid')

    assert response.status_code == 200

    payment = PaymentRecord.objects.get(razorpay_payment_id='pay_123')
    assert payment.tenant == tenant
    assert payment.amount == 99900
    
    tenant.refresh_from_db()
    assert tenant.delivery_count == 0


@patch('apps.billing.razorpay_client.verify_webhook_signature')
def test_webhook_subscription_cancelled(mock_verify, tenant):
    mock_verify.return_value = True

    from tests.factories import SubscriptionFactory
    sub = SubscriptionFactory(tenant=tenant, status='active', plan='pro')
    tenant.plan = 'pro'
    tenant.save()

    client = APIClient()
    response = client.post('/api/v1/billing/webhook/', {
        'event': 'subscription.cancelled',
        'payload': {
            'subscription': {
                'entity': {
                    'id': sub.razorpay_subscription_id
                }
            }
        }
    }, format='json', HTTP_X_RAZORPAY_SIGNATURE='valid')

    assert response.status_code == 200
    
    sub.refresh_from_db()
    assert sub.status == 'cancelled'
    
    tenant.refresh_from_db()
    assert tenant.plan == 'free'
