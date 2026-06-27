from asgiref.sync import sync_to_async
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from adrf.views import APIView as AsyncAPIView

from apps.core.cache import cache_aside, invalidate
from apps.webhooks.models import DeliveryAttempt, WebhookEndpoint, WebhookEvent
from apps.webhooks.serializers import (
    DeliveryAttemptSerializer,
    EndpointListSerializer,
    EndpointSerializer,
    EventDetailSerializer,
    EventDispatchSerializer,
    EventListSerializer,
)


class EndpointListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.user
        data = cache_aside(
            f'relay:cache:endpoints:{tenant.id}',
            lambda: EndpointListSerializer(
                WebhookEndpoint.objects.filter(tenant=tenant, is_active=True), many=True
            ).data,
            300,
        )
        return Response(data)

    def post(self, request):
        serializer = EndpointSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        endpoint = serializer.save()
        return Response(serializer.to_representation(endpoint), status=status.HTTP_201_CREATED)


class EndpointDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_endpoint(self, request, pk):
        from django.http import Http404
        try:
            return WebhookEndpoint.objects.get(id=pk, tenant=request.user, is_active=True)
        except WebhookEndpoint.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        data = cache_aside(
            f'relay:cache:endpoint:{pk}',
            lambda: EndpointSerializer(self._get_endpoint(request, pk)).data,
            300,
        )
        return Response(data)

    def patch(self, request, pk):
        try:
            endpoint = self._get_endpoint(request, pk)
        except WebhookEndpoint.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = EndpointSerializer(endpoint, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        endpoint = serializer.save()
        return Response(serializer.to_representation(endpoint))

    def delete(self, request, pk):
        try:
            endpoint = self._get_endpoint(request, pk)
        except WebhookEndpoint.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        endpoint.is_active = False
        endpoint.save(update_fields=['is_active'])
        invalidate(
            f'relay:cache:endpoints:{request.user.id}',
            f'relay:cache:endpoint:{pk}',
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventListCreateView(AsyncAPIView):
    permission_classes = [IsAuthenticated]

    async def get(self, request):
        @sync_to_async
        def fetch():
            tenant = request.user
            qs = WebhookEvent.objects.filter(tenant=tenant).order_by('-created_at')

            if status_filter := request.query_params.get('status'):
                qs = qs.filter(status=status_filter)
            if endpoint_id := request.query_params.get('endpoint_id'):
                qs = qs.filter(endpoint_id=endpoint_id)

            from apps.core.pagination import StandardPagination
            paginator = StandardPagination()
            page = paginator.paginate_queryset(qs, request)
            serializer = EventListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        return await fetch()

    async def post(self, request):
        serializer = EventDispatchSerializer(data=request.data, context={'request': request})
        await sync_to_async(serializer.is_valid)(raise_exception=True)
        event = await sync_to_async(serializer.save)()
        return Response(
            serializer.to_representation(event),
            status=status.HTTP_202_ACCEPTED,
        )


class EventDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        data = cache_aside(
            f'relay:cache:event:{pk}',
            lambda: EventDetailSerializer(
                WebhookEvent.objects.get(id=pk, tenant=request.user)
            ).data,
            120,
        )
        return Response(data)


class EventAttemptsView(AsyncAPIView):
    permission_classes = [IsAuthenticated]

    async def get(self, request, pk):
        @sync_to_async
        def fetch():
            event = WebhookEvent.objects.get(id=pk, tenant=request.user)
            return cache_aside(
                f'relay:cache:attempts:{pk}',
                lambda: DeliveryAttemptSerializer(
                    DeliveryAttempt.objects.filter(event=event).order_by('attempt_number'),
                    many=True,
                ).data,
                120,
            )

        data = await fetch()
        return Response(data)
