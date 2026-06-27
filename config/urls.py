from django.contrib import admin
from django.urls import include, path
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.tenants.urls', namespace='auth')),
    path('api/v1/', include('apps.tenants.api_urls', namespace='api-keys')),
    path('api/v1/', include('apps.webhooks.urls', namespace='webhooks')),
    path('api/v1/', include('apps.billing.urls', namespace='billing')),
]

if settings.DEBUG and 'debug_toolbar' in settings.INSTALLED_APPS:
    import debug_toolbar
    urlpatterns += [
        path('__debug__/', include(debug_toolbar.urls)),
    ]
