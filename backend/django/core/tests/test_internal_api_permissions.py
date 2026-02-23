import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import Client, TestCase


class InternalApiPermissionTests(TestCase):
    """Covers the contract that /admin-api/* is internal/staff-only."""

    def setUp(self):
        self.client = Client()

    def test_admin_health_denies_without_token(self):
        with patch.dict(os.environ, {"INTERNAL_API_TOKEN": "test-token"}, clear=False):
            response = self.client.get("/admin-api/health/")
        self.assertEqual(response.status_code, 403)

    def test_admin_health_denies_with_invalid_token(self):
        with patch.dict(os.environ, {"INTERNAL_API_TOKEN": "test-token"}, clear=False):
            response = self.client.get("/admin-api/health/", HTTP_X_INTERNAL_TOKEN="wrong-token")
        self.assertEqual(response.status_code, 403)

    def test_admin_health_allows_internal_token(self):
        with patch.dict(os.environ, {"INTERNAL_API_TOKEN": "test-token"}, clear=False):
            response = self.client.get("/admin-api/health/", HTTP_X_INTERNAL_TOKEN="test-token")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("status"), "ok")

    def test_admin_health_allows_staff_session(self):
        user_model = get_user_model()
        staff_user = user_model.objects.create_user(
            username="staff",
            email="staff@example.com",
            password="password123",
            is_staff=True,
        )
        self.client.force_login(staff_user)

        with patch.dict(os.environ, {"INTERNAL_API_TOKEN": "test-token"}, clear=False):
            response = self.client.get("/admin-api/health/")
        self.assertEqual(response.status_code, 200)

    def test_analytics_routes_require_internal_or_staff(self):
        with patch.dict(os.environ, {"INTERNAL_API_TOKEN": "test-token"}, clear=False):
            webhook_resp = self.client.get("/admin-api/analytics/webhooks/")
            roles_resp = self.client.get("/admin-api/analytics/user-roles/")
        self.assertEqual(webhook_resp.status_code, 403)
        self.assertEqual(roles_resp.status_code, 403)

    def test_analytics_routes_allow_internal_token_and_keep_shape(self):
        with patch.dict(os.environ, {"INTERNAL_API_TOKEN": "test-token"}, clear=False):
            webhook_resp = self.client.get(
                "/admin-api/analytics/webhooks/",
                HTTP_X_INTERNAL_TOKEN="test-token",
            )
            roles_resp = self.client.get(
                "/admin-api/analytics/user-roles/",
                HTTP_X_INTERNAL_TOKEN="test-token",
            )

        self.assertEqual(webhook_resp.status_code, 200)
        self.assertIn("webhook_events", webhook_resp.json())
        self.assertEqual(sorted(webhook_resp.json()["webhook_events"].keys()), ["pending", "processed", "total"])

        self.assertEqual(roles_resp.status_code, 200)
        self.assertIn("users_by_role", roles_resp.json())
