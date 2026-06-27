from django.urls import path

from apps.webhooks.views import (
    EndpointDetailView,
    EndpointListCreateView,
    EventAttemptsView,
    EventListCreateView,
    EventDetailView,
)

app_name = 'webhooks'

urlpatterns = [
    path('endpoints/', EndpointListCreateView.as_view(), name='endpoint-list-create'),
    path('endpoints/<uuid:pk>/', EndpointDetailView.as_view(), name='endpoint-detail'),
    path('events/', EventListCreateView.as_view(), name='event-list-create'),
    path('events/<uuid:pk>/', EventDetailView.as_view(), name='event-detail'),
    path('events/<uuid:pk>/attempts/', EventAttemptsView.as_view(), name='event-attempts'),
]
