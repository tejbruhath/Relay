from django.contrib import admin

from apps.billing.models import PaymentRecord, Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'plan', 'status', 'razorpay_subscription_id', 'created_at']
    list_filter = ['plan', 'status']
    search_fields = ['tenant__name', 'razorpay_subscription_id']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(PaymentRecord)
class PaymentRecordAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'razorpay_payment_id', 'amount', 'currency', 'status', 'captured_at']
    list_filter = ['status', 'currency']
    search_fields = ['tenant__name', 'razorpay_payment_id']
    readonly_fields = ['id', 'created_at']
