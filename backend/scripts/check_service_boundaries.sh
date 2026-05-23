#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "Boundary check failed: $1" >&2
  exit 1
}

if rg -n "path\('webhooks/" backend/django/adminpanel/urls.py >/dev/null; then
  fail "Django must not expose public webhook endpoints."
fi

if [ -f backend/django/core/views_webhooks.py ]; then
  fail "Django webhook ingestion view must not exist; NestJS owns webhooks."
fi

if find backend/django/core/migrations -type f ! -name '__init__.py' ! -path '*/__pycache__/*' | grep -q .; then
  fail "Django core migrations are disabled; Prisma owns shared schema migrations."
fi

if rg -n "^stripe$|^stripe[<>=]" backend/django/requirements.txt >/dev/null; then
  fail "Stripe SDK must live in NestJS webhook ingress service only."
fi

if ! rg -n "@Controller\('webhooks'\)" backend/nestjs/src/webhooks/webhooks.controller.ts >/dev/null; then
  fail "NestJS webhook controller is required."
fi

if ! rg -n "@Controller\('realtime'\)" backend/nestjs/src/realtime/realtime.controller.ts >/dev/null; then
  fail "NestJS realtime controller is required."
fi

if ! rg -n "@Controller\('auth'\)" backend/nestjs/src/auth/auth.controller.ts >/dev/null; then
  fail "NestJS auth controller is required."
fi

if ! rg -n "@Controller\('internal/admin'\)" backend/nestjs/src/internal-admin/internal-admin.controller.ts >/dev/null; then
  fail "NestJS internal Django admin bridge controller is required."
fi

if ! rg -n "@UseGuards\(InternalTokenGuard\)" backend/nestjs/src/internal-admin/internal-admin.controller.ts >/dev/null; then
  fail "NestJS internal Django bridge must be protected by InternalTokenGuard."
fi

if ! rg -n "class InternalTokenGuard" backend/nestjs/src/internal-admin/internal-token.guard.ts >/dev/null; then
  fail "NestJS InternalTokenGuard is required."
fi

if ! rg -n "'X-Internal-Token'" backend/nestjs/src/internal-admin/django-admin-client.service.ts >/dev/null; then
  fail "NestJS internal Django client must send X-Internal-Token."
fi

if [ ! -x scripts/smoke_internal_bridge.sh ]; then
  fail "scripts/smoke_internal_bridge.sh must exist and be executable."
fi

echo "Service boundary checks passed."
