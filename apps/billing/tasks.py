from celery import shared_task
from django.core.cache import cache

from apps.tenants.models import Tenant


@shared_task(name='billing.reset_monthly_usage')
def reset_monthly_usage():
    Tenant.objects.update(delivery_count=0)
    cache.delete_pattern('relay:cache:usage:*')
