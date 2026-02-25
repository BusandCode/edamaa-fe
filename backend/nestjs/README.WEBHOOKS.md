# Webhook handling (NestJS)

Webhook endpoints live in `src/webhooks`.

- `POST /webhooks/stripe`
- `POST /webhooks/mux`

Service boundary:

- NestJS is the single public ingress for Stripe and Mux webhooks.
- Django does not expose public webhook routes.

## Required env

```bash
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
STRIPE_API_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_TUTOR_SUBSCRIPTION_PRICE_ID=price_...
STRIPE_SCHOOL_SUBSCRIPTION_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=...
MUX_WEBHOOK_SECRET=...
```

Behavior:

- Stripe uses raw-body signature verification when `STRIPE_WEBHOOK_SECRET` is set.
- Events are persisted in Prisma (`WebhookEvent`) and queued to Redis/BullMQ.
- Worker process (`npm run worker`) marks events as processed.
