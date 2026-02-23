from django.contrib import admin
from .models import PlatformUser, WebhookEvent


@admin.register(PlatformUser)
class PlatformUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'role', 'created_at')
    search_fields = ('id', 'email', 'role')
    readonly_fields = ('id', 'email', 'name', 'role', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_view_permission(self, request, obj=None):
        return bool(request.user and request.user.is_staff)

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'provider', 'event_type', 'processed', 'created_at')
    list_filter = ('provider', 'processed', 'created_at')
    search_fields = ('provider', 'event_type', 'id')
    readonly_fields = ('id', 'provider', 'event_type', 'signature', 'payload', 'processed', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_view_permission(self, request, obj=None):
        return bool(request.user and request.user.is_staff)

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
