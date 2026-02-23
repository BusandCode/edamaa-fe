from django.db import models


class PlatformUser(models.Model):
    """
    Read-only mapping of Prisma's User table for admin analytics.

    Prisma is the migration owner for shared domain tables.
    """

    id = models.IntegerField(primary_key=True)
    email = models.CharField(max_length=255)
    name = models.CharField(max_length=255, null=True, blank=True)
    role = models.CharField(max_length=64)
    created_at = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'User'
        verbose_name = 'Platform User'
        verbose_name_plural = 'Platform Users'

    def __str__(self):
        return f"{self.email} ({self.role})"


class WebhookEvent(models.Model):
    """
    Read-only mapping of Prisma's WebhookEvent table.
    """

    id = models.IntegerField(primary_key=True)
    provider = models.CharField(max_length=64)
    event_type = models.CharField(max_length=128, db_column='eventType', blank=True, default='')
    signature = models.CharField(max_length=255, blank=True, default='')
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'WebhookEvent'

    def __str__(self):
        return f"{self.provider}:{self.event_type or 'unknown'} ({self.id})"
