from django.urls import path

from apps.billing.views import (
    CreateSubscriptionView,
    RazorpayWebhookView,
    SubscriptionStatusView,
)

app_name = 'billing'

urlpatterns = [
    path('billing/create-subscription/', CreateSubscriptionView.as_view(), name='create-subscription'),
    path('billing/subscription/', SubscriptionStatusView.as_view(), name='subscription-status'),
    path('billing/webhook/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
]
