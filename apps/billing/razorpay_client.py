import razorpay
from django.conf import settings

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

PLAN_IDS = {
    'pro': settings.RAZORPAY_PLAN_ID_PRO,
    'scale': settings.RAZORPAY_PLAN_ID_SCALE,
}


def create_subscription(tenant_id: str, plan: str) -> dict:
    return client.subscription.create({
        'plan_id': PLAN_IDS[plan],
        'total_count': 12,
        'notes': {'tenant_id': str(tenant_id)},
    }, idempotency_key=f"{tenant_id}-{plan}")


def verify_webhook_signature(payload_body: bytes, signature: str) -> bool:
    try:
        client.utility.verify_webhook_signature(
            payload_body.decode(), signature, settings.RAZORPAY_WEBHOOK_SECRET
        )
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
