from django.contrib import admin

from apps.tenants.models import APIKey, Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'plan', 'delivery_count', 'is_active', 'created_at']
    list_filter = ['plan', 'is_active']
    search_fields = ['name', 'email']
    readonly_fields = ['id', 'password_hash', 'created_at', 'updated_at']


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ['prefix', 'tenant', 'name', 'is_active', 'last_used_at', 'created_at']
    list_filter = ['is_active']
    search_fields = ['prefix', 'name']
    readonly_fields = ['id', 'key_hash', 'created_at']
