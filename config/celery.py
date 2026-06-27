import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('relay')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(['apps.webhooks', 'apps.billing'])

app.conf.task_routes = {
    'webhooks.dispatch_webhook': {'queue': 'relay.dispatch'},
    'webhooks.process_dlq': {'queue': 'relay.maintenance'},
    'billing.reset_monthly_usage': {'queue': 'relay.maintenance'},
}

app.conf.beat_schedule = {
    'process-dlq-every-5min': {
        'task': 'webhooks.process_dlq',
        'schedule': 300.0,
    },
    'reset-monthly-usage': {
        'task': 'billing.reset_monthly_usage',
        'schedule': crontab(hour=0, minute=0, day_of_month=1),
    },
}
