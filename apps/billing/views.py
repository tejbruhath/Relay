from asgiref.sync import sync_to_async
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from adrf.views import APIView as AsyncAPIView

from apps.billing.models import Subscription
from apps.billing.serializers import (
    CreateSubscriptionSerializer,
    RazorpayWebhookSerializer,
    SubscriptionStatusSerializer,
)
from apps.core.cache import cache_aside


class CreateSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateSubscriptionSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        subscription = serializer.save()
        return Response(serializer.to_representation(subscription), status=status.HTTP_201_CREATED)


class SubscriptionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.user
        data = cache_aside(
            f'relay:cache:subscription:{tenant.id}',
            lambda: SubscriptionStatusSerializer(
                Subscription.objects.get(tenant=tenant)
            ).data,
            300,
        )
        return Response(data)


class RazorpayWebhookView(AsyncAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    async def post(self, request):
        raw_body = request.body
        serializer = RazorpayWebhookSerializer(data=request.data, context={'request': request, 'raw_body': raw_body})
        await sync_to_async(serializer.is_valid)(raise_exception=True)
        await sync_to_async(serializer.save)()
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)
