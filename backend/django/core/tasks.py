import logging

from celery import shared_task
from django.db.models import Count

from .models import PlatformUser, WebhookEvent

logger = logging.getLogger(__name__)


@shared_task
def run_webhook_analytics_snapshot() -> dict:
    """Example heavy analytics job for admin/ML pipelines (read-only)."""
    total = WebhookEvent.objects.count()
    processed = WebhookEvent.objects.filter(processed=True).count()
    pending = total - processed
    snapshot = {'total': total, 'processed': processed, 'pending': pending}
    logger.info('Analytics snapshot computed: %s', snapshot)
    return snapshot


@shared_task
def run_user_role_snapshot() -> dict:
    """Aggregate user roles from Prisma-owned user data."""
    rows = PlatformUser.objects.values('role').annotate(total=Count('id')).order_by('role')
    counts = {(row['role'] or 'unknown'): row['total'] for row in rows}

    logger.info('User role snapshot computed: %s', counts)
    return counts
