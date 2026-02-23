"""Django package bootstrap.

This app normally wires Celery at import time so workers can autodiscover tasks.
For lean test/bootstrap environments where Celery is not installed yet, we allow
startup to continue and keep web/admin endpoints usable.
"""

try:
    from .celery import app as celery_app
except ModuleNotFoundError as exc:
    # Only soften the missing optional dependency. Any other missing module is
    # still a real error and should fail fast.
    if exc.name != "celery":
        raise
    celery_app = None

__all__ = ("celery_app",)
