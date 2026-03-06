# edamaa - NestJS API

NestJS + Prisma service for:

- Client-facing API routes
- Supabase-backed auth context
- Realtime signaling over Redis pub/sub
- Stripe and Mux webhook intake

Ownership rules:

- Prisma migrations in this service own shared domain schema changes.
- Stripe and Mux webhook endpoints are exposed only here.

## Setup

```bash
cd backend/nestjs
npm install
cp .env.example .env
```

Set at least:

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
REDIS_URL=redis://localhost:6379
DJANGO_INTERNAL_API_URL=http://localhost:8000/admin-api
INTERNAL_API_TOKEN=<same token configured in Django>
STRIPE_API_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_TUTOR_SUBSCRIPTION_PRICE_ID=price_...
STRIPE_SCHOOL_SUBSCRIPTION_PRICE_ID=price_...
SCHOOL_FEE_REMINDERS_ENABLED=1
SCHOOL_FEE_REMINDERS_INTERVAL_MS=300000
SCHOOL_FEE_DUE_SOON_WINDOW_HOURS=72
SCHOOL_FEE_REMINDER_EMAIL_ENABLED=0
```

Note:
- `src/main.ts` and `src/worker/worker.ts` now auto-load `backend/nestjs/.env` at startup.
- You no longer need to manually run `source .env` before `npm run start` or `npm run worker`.

Optional local smoke flags (use only when infra is intentionally unavailable):

```bash
SKIP_PRISMA_CONNECT=1
SKIP_REDIS_CONNECT=1
SKIP_QUEUE_CONNECT=1
DISABLE_QUEUES_UI=1
REDIS_INIT_TIMEOUT_MS=4000
```

These flags let the internal Django admin bridge boot without Postgres/Redis so
you can validate service-to-service auth and proxy wiring in isolation.

Generate Prisma client and apply schema:

```bash
npx prisma generate
npx prisma db push
```

If `prisma db push` cannot run in your environment, apply the SQL manually:

```bash
psql "$DATABASE_URL" -f prisma/manual/20260224_add_call_signal_event.sql
psql "$DATABASE_URL" -f prisma/manual/20260303_add_account_roles.sql
psql "$DATABASE_URL" -f prisma/manual/20260306_add_school_fee_reminder_dispatches.sql
```

Start API:

```bash
npm run start
```

Start worker:

```bash
npm run worker
```

Realtime endpoints:

- `POST /realtime/signal`
- `GET /realtime/stream?channel=signal:student-communication`
- `GET /realtime/call-events` (filters: `channel`, `event`, `studentId`, repeated `reason`, `limit`)

Subscription endpoints (requires `Authorization: Bearer <supabase_access_token>`):

- `GET /subscriptions/me/status?actor=tutor|school`
- `POST /subscriptions/me/checkout`
- `POST /subscriptions/me/sync`

School finance reminder endpoints (school role):

- `GET /school-finance/me/reminders/dispatches?type=due_soon|overdue&channel=in_app|email&status=queued|sent|failed|skipped&limit=80`
- `POST /school-finance/me/reminders/run`

Account roles endpoints (requires `Authorization: Bearer <supabase_access_token>`):

- `GET /account/roles/me`
- `POST /account/roles/request`
- `POST /account/roles/switch`
- `POST /account/roles/deactivate`
- `GET /account/roles/requests?status=pending|approved|rejected|canceled` (admin only)
- `POST /account/roles/requests/:requestId/approve` (admin only)
- `POST /account/roles/requests/:requestId/reject` (admin only)

Student analytics endpoint:

- `GET /student-analytics/me/performance` (requires `Authorization: Bearer <supabase_access_token>`)
- `GET /student-analytics/performance` (internal service route; requires `X-Internal-Token`)

Internal Django admin bridge (`X-Internal-Token` required):

- `GET /internal/admin/proxy-health`
- `GET /internal/admin/health`
- `GET /internal/admin/analytics/webhooks`
- `GET /internal/admin/analytics/user-roles`

Quick check:

```bash
curl -H "X-Internal-Token: $INTERNAL_API_TOKEN" http://localhost:3001/internal/admin/health
```

Automated smoke check:

```bash
# run from repo root
make smoke-internal-bridge INTERNAL_API_TOKEN=$INTERNAL_API_TOKEN
```
