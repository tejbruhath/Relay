from django.contrib import admin

from apps.webhooks.models import DeliveryAttempt, WebhookEndpoint, WebhookEvent


@admin.register(WebhookEndpoint)
class WebhookEndpointAdmin(admin.ModelAdmin):
    list_display = ['url', 'tenant', 'is_active', 'rate_limit_per_minute', 'created_at']
    list_filter = ['is_active']
    search_fields = ['url', 'tenant__name']
    readonly_fields = ['id', 'secret_hash', 'secret_prefix', 'created_at', 'updated_at']


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'tenant', 'endpoint', 'status', 'attempt_count', 'created_at']
    list_filter = ['status']
    search_fields = ['event_type', 'idempotency_key']
    readonly_fields = ['id', 'created_at', 'delivered_at']


@admin.register(DeliveryAttempt)
class DeliveryAttemptAdmin(admin.ModelAdmin):
    list_display = ['event', 'attempt_number', 'status', 'http_status_code', 'duration_ms', 'attempted_at']
    list_filter = ['status']
    readonly_fields = ['id', 'attempted_at']
