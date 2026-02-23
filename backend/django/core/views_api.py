from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count
from django.db.utils import OperationalError

from .models import PlatformUser, WebhookEvent
from .permissions import IsInternalServiceOrAdmin


@api_view(['GET'])
@permission_classes([IsInternalServiceOrAdmin])
def admin_health(_request):
    return Response({'status': 'ok', 'service': 'django-admin-api'})


@api_view(['GET'])
@permission_classes([IsInternalServiceOrAdmin])
def webhook_analytics(_request):
    try:
        total = WebhookEvent.objects.count()
        processed = WebhookEvent.objects.filter(processed=True).count()
        pending = total - processed
        degraded = False
    except OperationalError:
        # Local smoke/dev SQLite may not contain Prisma-owned read-only tables.
        # Keep the bridge contract stable by returning an empty analytics shape.
        total = 0
        processed = 0
        pending = 0
        degraded = True

    return Response(
        {
            'webhook_events': {
                'total': total,
                'processed': processed,
                'pending': pending,
            },
            'degraded': degraded,
        }
    )


@api_view(['GET'])
@permission_classes([IsInternalServiceOrAdmin])
def user_role_analytics(_request):
    try:
        rows = PlatformUser.objects.values('role').annotate(total=Count('id')).order_by('role')
        counts = {(row['role'] or 'unknown'): row['total'] for row in rows}
        degraded = False
    except OperationalError:
        # Same local fallback as webhook analytics when Prisma tables are absent.
        counts = {}
        degraded = True

    return Response({'users_by_role': counts, 'degraded': degraded})
