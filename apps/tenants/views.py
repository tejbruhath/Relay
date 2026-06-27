import datetime

from rest_framework import status
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.cache import cache_aside, invalidate
from apps.tenants.models import APIKey
from apps.tenants.serializers import (
    APIKeyListSerializer,
    APIKeySerializer,
    TenantLoginSerializer,
    TenantRegisterSerializer,
    UsageSerializer,
)


class TenantRegisterView(CreateAPIView):
    serializer_class = TenantRegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(serializer.to_representation(result), status=status.HTTP_201_CREATED)


class TenantLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = TenantLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.to_representation(serializer.validated_data))


class APIKeyListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.user
        data = cache_aside(
            f'relay:cache:apikeys:{tenant.id}',
            lambda: APIKeyListSerializer(
                APIKey.objects.filter(tenant=tenant, is_active=True), many=True
            ).data,
            300,
        )
        return Response(data)

    def post(self, request):
        serializer = APIKeySerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        api_key = serializer.save()
        return Response(serializer.to_representation(api_key), status=status.HTTP_201_CREATED)


class APIKeyDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        tenant = request.user
        try:
            api_key = APIKey.objects.get(id=pk, tenant=tenant, is_active=True)
        except APIKey.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        api_key.is_active = False
        api_key.save(update_fields=['is_active'])
        invalidate(f'relay:cache:apikeys:{tenant.id}')
        return Response(status=status.HTTP_204_NO_CONTENT)


class UsageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.user
        data = cache_aside(
            f'relay:cache:usage:{tenant.id}',
            lambda: {
                'plan': tenant.plan,
                'delivery_count': tenant.delivery_count,
                'delivery_quota': tenant.delivery_quota,
                'quota_exceeded': tenant.quota_exceeded,
                'period_start': datetime.date.today().replace(day=1).isoformat(),
                'period_end': (
                    datetime.date.today().replace(day=28) + datetime.timedelta(days=4)
                ).replace(day=1).isoformat() if datetime.date.today().month < 12
                else datetime.date(datetime.date.today().year + 1, 1, 1).isoformat(),
            },
            60,
        )
        return Response(data)
