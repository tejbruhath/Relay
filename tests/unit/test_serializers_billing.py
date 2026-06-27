# tests/unit/test_serializers_billing.py
from unittest.mock import patch
from apps.billing.serializers import RazorpayWebhookSerializer

def test_razorpay_webhook_serializer_validates():
    serializer = RazorpayWebhookSerializer(data={
        "event": "subscription.activated",
        "payload": {
            "subscription": {
                "entity": {
                    "id": "sub_123",
                    "plan_id": "plan_pro",
                    "status": "active"
                }
            }
        }
    })
    assert serializer.is_valid()
