# edamaa - Django admin/analytics

Django + DRF + Celery service for:

- Internal admin workflows (`/admin`)
- Internal analytics APIs (`/admin-api/*`)
- Heavy background jobs and ML/analytics pipelines

Ownership rules:

- Django is internal-only and does not expose public payment/video webhooks.
- Prisma (NestJS) owns shared domain schema migrations.
- Django `core` models map Prisma tables in read-only mode for analytics/admin views.

## Setup

```bash
cd backend/django
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set environment:

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
INTERNAL_API_TOKEN=<long-random-token>
SENTRY_DSN=...
SENTRY_TRACES_SAMPLE_RATE=0.1
```

Run migrations and start server:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

Start Celery worker:

```bash
celery -A adminpanel worker -l info
```

## Internal API auth

`/admin-api/*` endpoints require either:

- an authenticated Django staff session, or
- `X-Internal-Token` matching `INTERNAL_API_TOKEN`.

NestJS internal bridge uses this token when calling `/admin-api/*`.
