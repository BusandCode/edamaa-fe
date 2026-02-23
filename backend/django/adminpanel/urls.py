from django.contrib import admin
from django.urls import path
from core import views_api


urlpatterns = [
    path('admin/', admin.site.urls),
    # Internal analytics/admin APIs (not public client endpoints).
    path('admin-api/health/', views_api.admin_health),
    path('admin-api/analytics/webhooks/', views_api.webhook_analytics),
    path('admin-api/analytics/user-roles/', views_api.user_role_analytics),
]
