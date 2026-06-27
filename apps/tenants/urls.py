from django.urls import path

from apps.tenants.views import TenantLoginView, TenantRegisterView

app_name = 'auth'

urlpatterns = [
    path('register/', TenantRegisterView.as_view(), name='register'),
    path('login/', TenantLoginView.as_view(), name='login'),
]
