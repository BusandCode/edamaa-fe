import hmac
import os

from rest_framework.permissions import BasePermission


class IsInternalServiceOrAdmin(BasePermission):
    """
    Allow access from:
    - Django admin staff sessions, or
    - trusted internal callers with X-Internal-Token.
    """

    message = 'Internal service token or admin session required.'

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and user.is_staff:
            return True

        expected = os.environ.get('INTERNAL_API_TOKEN', '')
        provided = request.headers.get('X-Internal-Token', '')
        if not expected or not provided:
            return False

        return hmac.compare_digest(provided, expected)
