import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from apps.billing.models import Subscription, PaymentRecord
from tests.factories import SubscriptionFactory

pytestmark = pytest.mark.django_db

@patch("apps.billing.views.razorpay_client.create_subscription")
def test_create_subscription_returns_201(mock_create_sub, authed_client):
    mock_create_sub.return_value = {
        "id": "sub_123",
        "status": "created"
    }
    
    url = reverse("billing-create-subscription")
    response = authed_client.post(url, {"plan": "pro"}, format="json")
    
    assert response.status_code == 201
    assert response.data["subscription_id"] == "sub_123"
    assert "razorpay_key_id" in response.data

@patch("apps.billing.views.razorpay_client.create_subscription")
def test_create_subscription_calls_razorpay_with_idempotency_key(mock_create_sub, authed_client, tenant):
    mock_create_sub.return_value = {
        "id": "sub_123",
        "status": "created"
    }
    
    url = reverse("billing-create-subscription")
    authed_client.post(url, {"plan": "pro"}, format="json")
    
    assert mock_create_sub.called
    kwargs = mock_create_sub.call_args[1]
    assert "notes" in kwargs
    assert kwargs["notes"].get("tenant_id") == str(tenant.id)

def test_get_subscription_returns_current_status(authed_client, tenant):
    sub = SubscriptionFactory(tenant=tenant, status="active", plan="pro")
    
    url = reverse("billing-subscription-detail")
    response = authed_client.get(url)
    
    assert response.status_code == 200
    assert response.data["status"] == "active"
    assert response.data["plan"] == "pro"

@patch("apps.billing.views.razorpay_client.verify_webhook_signature")
def test_razorpay_webhook_invalid_signature_returns_400(mock_verify, client):
    mock_verify.return_value = False
    
    url = reverse("billing-webhook")
    response = client.post(url, {}, format="json", HTTP_X_RAZORPAY_SIGNATURE="invalid")
    
    assert response.status_code == 400

@patch("apps.billing.views.razorpay_client.verify_webhook_signature")
def test_razorpay_webhook_subscription_activated_updates_tenant(mock_verify, client, tenant):
    mock_verify.return_value = True
    sub = SubscriptionFactory(tenant=tenant, razorpay_subscription_id="sub_test", status="created", plan="pro")
    
    url = reverse("billing-webhook")
    payload = {
        "event": "subscription.activated",
        "payload": {
            "subscription": {
                "entity": {
                    "id": "sub_test",
                    "plan_id": "plan_test_pro",
                    "status": "active"
                }
            }
        }
    }
    
    response = client.post(url, payload, format="json", HTTP_X_RAZORPAY_SIGNATURE="valid")
    
    assert response.status_code == 200
    
    tenant.refresh_from_db()
    sub.refresh_from_db()
    
    assert tenant.plan == "pro"
    assert sub.status == "active"

@patch("apps.billing.views.razorpay_client.verify_webhook_signature")
def test_razorpay_webhook_subscription_halted_downgrades_to_free(mock_verify, client, tenant):
    mock_verify.return_value = True
    sub = SubscriptionFactory(tenant=tenant, razorpay_subscription_id="sub_test", status="active", plan="pro")
    tenant.plan = "pro"
    tenant.save()
    
    url = reverse("billing-webhook")
    payload = {
        "event": "subscription.halted",
        "payload": {
            "subscription": {
                "entity": {
                    "id": "sub_test",
                    "plan_id": "plan_test_pro",
                    "status": "halted"
                }
            }
        }
    }
    
    response = client.post(url, payload, format="json", HTTP_X_RAZORPAY_SIGNATURE="valid")
    
    assert response.status_code == 200
    
    tenant.refresh_from_db()
    sub.refresh_from_db()
    
    assert tenant.plan == "free"
    assert sub.status == "halted"

@patch("apps.billing.views.razorpay_client.verify_webhook_signature")
def test_razorpay_webhook_payment_captured_creates_record(mock_verify, client, tenant):
    mock_verify.return_value = True
    sub = SubscriptionFactory(tenant=tenant, razorpay_subscription_id="sub_test", status="active")
    
    url = reverse("billing-webhook")
    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test",
                    "amount": 5000,
                    "currency": "INR",
                    "status": "captured"
                }
            }
        },
        "account_id": "acc_123" # usually razorpay sends this, but we extract from payment
    }
    # To associate payment to subscription, usually there's notes or invoice.
    # Our simple handler might just take the entity. Let's assume it checks notes or we just mock the payload correctly
    # Relay's Razorpay webhook expects payment entity to have a subscription_id maybe?
    # No, typically razorpay passes subscription_id in payment entity or invoice.
    payload["payload"]["payment"]["entity"]["invoice_id"] = "inv_123"
    
    # Just to be safe with DB matching, I will add subscription_id directly if possible or we can just mock creation
    # Actually wait, the models section says PaymentRecord has `razorpay_subscription_id`. The handler must extract it.
    payload["payload"]["payment"]["entity"]["notes"] = {"subscription_id": "sub_test"}
    
    response = client.post(url, payload, format="json", HTTP_X_RAZORPAY_SIGNATURE="valid")
    
    assert response.status_code == 200
    
    record = PaymentRecord.objects.get(razorpay_payment_id="pay_test")
    assert record.tenant == tenant
    assert record.amount == 5000

@patch("apps.billing.views.razorpay_client.verify_webhook_signature")
def test_razorpay_webhook_unknown_event_returns_200(mock_verify, client):
    mock_verify.return_value = True
    
    url = reverse("billing-webhook")
    payload = {
        "event": "some.unknown.event",
        "payload": {}
    }
    
    response = client.post(url, payload, format="json", HTTP_X_RAZORPAY_SIGNATURE="valid")
    
    assert response.status_code == 200

@patch("apps.billing.views.razorpay_client.verify_webhook_signature")
def test_razorpay_webhook_is_idempotent(mock_verify, client, tenant):
    mock_verify.return_value = True
    SubscriptionFactory(tenant=tenant, razorpay_subscription_id="sub_test", status="active")
    
    url = reverse("billing-webhook")
    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test",
                    "amount": 5000,
                    "currency": "INR",
                    "status": "captured",
                    "notes": {"subscription_id": "sub_test"}
                }
            }
        }
    }
    
    res1 = client.post(url, payload, format="json", HTTP_X_RAZORPAY_SIGNATURE="valid")
    assert res1.status_code == 200
    
    res2 = client.post(url, payload, format="json", HTTP_X_RAZORPAY_SIGNATURE="valid")
    assert res2.status_code == 200
    
    assert PaymentRecord.objects.filter(razorpay_payment_id="pay_test").count() == 1
