from django.conf import settings
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.billing import razorpay_client
from apps.billing.models import PaymentRecord, Subscription
from apps.core.cache import invalidate
from apps.tenants.models import Tenant


class CreateSubscriptionSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=['pro', 'scale'])

    def validate_plan(self, value):
        tenant = self.context['request'].user
        if hasattr(tenant, 'subscription') and tenant.subscription.status == 'active':
            if tenant.subscription.plan == value:
                raise serializers.ValidationError('Already subscribed to this plan.')
        return value

    def create(self, validated_data):
        tenant = self.context['request'].user
        plan = validated_data['plan']

        rz_sub = razorpay_client.create_subscription(str(tenant.id), plan)

        subscription, created = Subscription.objects.update_or_create(
            tenant=tenant,
            defaults={
                'plan': plan,
                'razorpay_subscription_id': rz_sub['id'],
                'razorpay_plan_id': razorpay_client.PLAN_IDS[plan],
                'status': rz_sub.get('status', 'created'),
            },
        )
        invalidate(f'relay:cache:subscription:{tenant.id}')
        subscription._rz_response = rz_sub
        return subscription

    def to_representation(self, instance):
        return {
            'subscription_id': instance.razorpay_subscription_id,
            'razorpay_key_id': settings.RAZORPAY_KEY_ID,
            'plan': instance.plan,
        }


class SubscriptionStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = [
            'plan', 'status', 'current_period_start', 'current_period_end',
            'razorpay_subscription_id',
        ]


class RazorpayWebhookSerializer(serializers.Serializer):
    event = serializers.CharField()
    payload = serializers.DictField()

    def validate(self, attrs):
        request = self.context['request']
        raw_body = self.context['raw_body']
        signature = request.headers.get('X-Razorpay-Signature', '')
        if not razorpay_client.verify_webhook_signature(raw_body, signature):
            raise ValidationError('Invalid webhook signature.')
        return attrs

    def save(self, **kwargs):
        event_type = self.validated_data['event']
        payload = self.validated_data['payload']

        handler = {
            'subscription.activated': self._handle_subscription_activated,
            'payment.captured': self._handle_payment_captured,
            'subscription.halted': self._handle_subscription_halted,
            'subscription.cancelled': self._handle_subscription_cancelled,
        }.get(event_type)

        if handler:
            handler(payload)

    def _handle_subscription_activated(self, payload):
        import datetime
        sub_entity = payload.get('subscription', {}).get('entity', {})
        rz_sub_id = sub_entity.get('id')
        if not rz_sub_id:
            return

        try:
            subscription = Subscription.objects.select_related('tenant').get(
                razorpay_subscription_id=rz_sub_id
            )
        except Subscription.DoesNotExist:
            return

        subscription.status = 'active'
        if sub_entity.get('current_start'):
            subscription.current_period_start = timezone.datetime.fromtimestamp(
                sub_entity['current_start'], tz=datetime.timezone.utc
            )
        if sub_entity.get('current_end'):
            subscription.current_period_end = timezone.datetime.fromtimestamp(
                sub_entity['current_end'], tz=datetime.timezone.utc
            )
        subscription.save()

        tenant = subscription.tenant
        tenant.plan = subscription.plan
        tenant.save(update_fields=['plan'])

        invalidate(
            f'relay:cache:subscription:{tenant.id}',
            f'relay:cache:tenant:{tenant.id}',
            f'relay:cache:usage:{tenant.id}',
        )

    def _handle_payment_captured(self, payload):
        payment_entity = payload.get('payment', {}).get('entity', {})
        rz_payment_id = payment_entity.get('id')
        rz_sub_id = payment_entity.get('subscription_id')
        if not rz_payment_id:
            return

        try:
            subscription = Subscription.objects.select_related('tenant').get(
                razorpay_subscription_id=rz_sub_id
            )
        except Subscription.DoesNotExist:
            return

        tenant = subscription.tenant

        PaymentRecord.objects.get_or_create(
            razorpay_payment_id=rz_payment_id,
            defaults={
                'tenant': tenant,
                'razorpay_subscription_id': rz_sub_id or '',
                'amount': payment_entity.get('amount', 0),
                'currency': payment_entity.get('currency', 'INR'),
                'status': payment_entity.get('status', 'captured'),
                'captured_at': timezone.now(),
            },
        )

        tenant.delivery_count = 0
        tenant.save(update_fields=['delivery_count'])

        invalidate(
            f'relay:cache:subscription:{tenant.id}',
            f'relay:cache:usage:{tenant.id}',
        )

    def _handle_subscription_halted(self, payload):
        self._downgrade_tenant(payload)

    def _handle_subscription_cancelled(self, payload):
        self._downgrade_tenant(payload)

    def _downgrade_tenant(self, payload):
        sub_entity = payload.get('subscription', {}).get('entity', {})
        rz_sub_id = sub_entity.get('id')
        if not rz_sub_id:
            return

        try:
            subscription = Subscription.objects.select_related('tenant').get(
                razorpay_subscription_id=rz_sub_id
            )
        except Subscription.DoesNotExist:
            return

        event_type = self.validated_data['event']
        if 'halted' in event_type:
            subscription.status = 'halted'
        else:
            subscription.status = 'cancelled'
        subscription.save(update_fields=['status', 'updated_at'])

        tenant = subscription.tenant
        tenant.plan = 'free'
        tenant.save(update_fields=['plan'])

        invalidate(
            f'relay:cache:subscription:{tenant.id}',
            f'relay:cache:tenant:{tenant.id}',
            f'relay:cache:usage:{tenant.id}',
        )
