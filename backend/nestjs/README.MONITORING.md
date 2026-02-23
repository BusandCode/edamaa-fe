# Monitoring and observability (NestJS)

## BullMQ dashboard

Queue dashboard is mounted at `/admin/queues`.

Set credentials:

```bash
QUEUES_UI_USER=admin
QUEUES_UI_PASS=strong-password
```

## Sentry

Sentry is initialized when `SENTRY_DSN` is set.

```bash
SENTRY_DSN=https://...
SENTRY_TRACES_SAMPLE_RATE=0.1
```

For production, restrict dashboard access by network ACLs and strong credentials.
