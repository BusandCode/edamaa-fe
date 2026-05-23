# edamaa

Backend stack (as configured):

- Supabase (Postgres/Auth/Storage/Realtime) as the core DB/auth/store.
- NestJS + Prisma (TypeScript) for client-facing API, realtime signaling, and Stripe endpoints.
- Django + Django REST Framework + Celery (Python) for admin, analytics, ML, and heavy background jobs.
- Redis (cache/pubsub), S3/CDN (or Supabase Storage + CDN), Mux (video), and GitHub Actions + Sentry for CI/observability.

## Repo layout

- Frontend: React + TypeScript + Vite (`/`)
- NestJS API: `backend/nestjs`
- Django admin/analytics: `backend/django`
- Local infra helpers: `docker-compose.yml`, `Makefile`, `scripts/bootstrap.sh`

## Environment

### NestJS (`backend/nestjs/.env`)

Use Supabase DB URLs for Prisma and Supabase keys for auth/storage access.

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
REDIS_URL=redis://localhost:6379
DJANGO_INTERNAL_API_URL=http://localhost:8000/admin-api
INTERNAL_API_TOKEN=<same token configured in Django>
STRIPE_API_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_TUTOR_SUBSCRIPTION_PRICE_ID=price_...
STRIPE_SCHOOL_SUBSCRIPTION_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=...
MUX_WEBHOOK_SECRET=...
SENTRY_DSN=...
SENTRY_TRACES_SAMPLE_RATE=0.1
```

Startup note:
- NestJS API and worker automatically load `backend/nestjs/.env` on boot.
- Manual `source backend/nestjs/.env` is no longer required for local runs.

### Django (`backend/django`)

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
INTERNAL_API_TOKEN=<long-random-token>
SENTRY_DSN=...
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Frontend (`.env.local`)

```bash
# NestJS API base for client requests/signaling
VITE_API_BASE_URL=http://127.0.0.1:3001

# Supabase browser auth (required for cloud sign-in/sign-up)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>

# Optional: full ICE server list JSON (preferred for production)
# Supports either array form:
# VITE_WEBRTC_ICE_SERVERS_JSON=[{"urls":"stun:stun.l.google.com:19302"},{"urls":["turn:turn.example.com:3478"],"username":"user","credential":"pass"}]
# or object form:
# VITE_WEBRTC_ICE_SERVERS_JSON={"iceServers":[{"urls":"stun:stun.l.google.com:19302"}]}

# Optional: shorthand TURN configuration (used when JSON config is not provided)
VITE_TURN_URLS=turn:turn.example.com:3478,turns:turn.example.com:5349
VITE_TURN_USERNAME=<turn-username>
VITE_TURN_CREDENTIAL=<turn-credential>
```

Notes:

- If no TURN config is set, the app falls back to public STUN (`stun.l.google.com:19302`).
- If Supabase keys are missing in local development, sign-in falls back to local dev mode for UI testing.
- After changing `.env.local`, restart `npm run dev`.

## Quick start

```bash
# from repo root
bash scripts/bootstrap.sh
```

For a one-command local backend run (Django + NestJS + bridge smoke):

```bash
make local-up
```

For API-only development (recommended for frontend/payments work):

```bash
make api-up
```

Stop those local processes:

```bash
make local-down
```

Start/stop the frontend web app (Vite):

```bash
make web-up
make web-down
```

`make web-up` now auto-starts the NestJS API if `http://127.0.0.1:3001/auth/health` is not reachable.

Running `npm run dev` also auto-starts the NestJS API first, then launches Vite.
If the API drops during development, `npm run dev` automatically tries to restart it.

Notes:

- If `DATABASE_URL` is not set, bootstrap falls back to local Postgres (`docker-compose`).
- Redis is always started locally for cache/pubsub/queues.
- For external DB URLs (for example Supabase), schema mutation is skipped by default. Set `ALLOW_SCHEMA_PUSH=1` to run `prisma db push` and Django migrations in bootstrap.

Then run frontend:

```bash
npm install
npm run dev
```

## Backend runtime commands

```bash
# Infra helpers
make up
make down

# NestJS + Prisma
make nest-install
make prisma-generate
make prisma-push
make nest-start

# Django
make django-install
make django-migrate

# Policy + smoke checks
make check-boundaries
make smoke-internal-bridge INTERNAL_API_TOKEN=<token>
```

## Service boundaries

1. NestJS is the only public API surface for clients, webhooks, and realtime signaling.
2. Django is internal-only for admin/analytics/ML workloads.
3. Prisma is the migration owner for shared domain tables.
4. BullMQ is used for low-latency app jobs; Celery is used for heavy/offline analytics jobs.
5. CI enforces these boundaries via `scripts/check_service_boundaries.sh`.

## Key endpoints

- NestJS auth (Supabase-backed):
  - `GET /auth/health`
  - `GET /auth/me` (Bearer token required)
- NestJS payments (Supabase auth required):
  - `GET /payments/me/dashboard`
  - `POST /payments/me/methods/setup-intent`
  - `POST /payments/me/methods/stripe/confirm`
  - `POST /payments/me/transactions/:transactionId/pay`
  - `GET /payments/me/transactions/:transactionId/receipt`
- NestJS subscriptions (Supabase auth required):
  - `GET /subscriptions/me/status?actor=tutor|school`
  - `POST /subscriptions/me/checkout`
  - `POST /subscriptions/me/sync`
- NestJS realtime signaling:
  - `POST /realtime/signal`
  - `GET /realtime/stream` (SSE)
  - `GET /realtime/call-events` (persisted call signal history; supports `reason`, `studentId`, `limit`)
- NestJS webhooks:
  - `POST /webhooks/stripe`
  - `POST /webhooks/mux`
- NestJS internal Django bridge:
  - `GET /internal/admin/proxy-health`
  - `GET /internal/admin/health`
  - `GET /internal/admin/analytics/webhooks`
  - `GET /internal/admin/analytics/user-roles`
  - `X-Internal-Token` required at NestJS layer
- Django admin/analytics:
  - `GET /admin/`
  - `GET /admin-api/health/` (internal-only; `X-Internal-Token` or staff session)
  - `GET /admin-api/analytics/webhooks/` (internal-only; `X-Internal-Token` or staff session)
  - `GET /admin-api/analytics/user-roles/` (internal-only; `X-Internal-Token` or staff session)

## Workers

```bash
# NestJS webhook queue worker
cd backend/nestjs
npm run worker

# Django Celery worker
cd backend/django
. .venv/bin/activate
celery -A adminpanel worker -l info
```
