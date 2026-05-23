# Backend Service Boundaries

This project enforces strict ownership between backend services.

## Rules

1. `NestJS` is the only public client/API ingress.
2. `NestJS` owns all Stripe and Mux webhook ingestion.
3. `Django` is internal-only for admin, analytics, ML, and heavy jobs.
4. `Prisma` is the migration owner for shared domain schema.
5. `BullMQ` is for low-latency app jobs; `Celery` is for heavy/offline jobs.

## Practical implications

- Do not add public webhook routes in `backend/django`.
- Do not add `backend/django/core/migrations/*` files for shared domain tables.
- Use read-only Django models (`managed = False`) when querying Prisma-owned tables.
- Keep public auth/realtime/webhooks in `backend/nestjs`.
- NestJS reaches Django internal APIs through `DJANGO_INTERNAL_API_URL` with `X-Internal-Token`.
- NestJS internal bridge routes (`/internal/admin/*`) are also protected by `X-Internal-Token`.

## Internal API protection

`/admin-api/*` endpoints require either:

- a Django staff session, or
- `X-Internal-Token` matching `INTERNAL_API_TOKEN`.

CI runs `scripts/smoke_internal_bridge.sh` to validate NestJS-to-Django internal routing.
CI also runs Django permission tests for `/admin-api/*` token/staff access control.
