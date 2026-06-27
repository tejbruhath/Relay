from django.urls import path

from apps.tenants.views import APIKeyDeleteView, APIKeyListCreateView, UsageView

app_name = 'api-keys'

urlpatterns = [
    path('api-keys/', APIKeyListCreateView.as_view(), name='api-key-list-create'),
    path('api-keys/<uuid:pk>/', APIKeyDeleteView.as_view(), name='api-key-delete'),
    path('usage/', UsageView.as_view(), name='usage'),
]
