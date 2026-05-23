#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NEST_DIR="$ROOT_DIR/backend/nestjs"

if [[ ! -d "$NEST_DIR" ]]; then
  echo "NestJS directory not found: $NEST_DIR" >&2
  exit 1
fi

cd "$NEST_DIR"

probe_sql='SELECT 1;'
if ! npx prisma db execute --schema prisma/schema.prisma --stdin >/tmp/edamaa-db-probe.log 2>&1 <<<"$probe_sql"; then
  echo "Cannot reach DATABASE_URL from backend/nestjs/.env."
  echo "Start Postgres first (for docker compose users: docker compose up -d db)."
  echo "Probe error:"
  cat /tmp/edamaa-db-probe.log
  exit 1
fi

npx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL'
DO $$
DECLARE
  tables text[] := ARRAY[
    'RoleChangeRequest',
    'UserRole',
    'SchoolFeePayment',
    'SchoolFeeInvoice',
    'SchoolFeePlan',
    'SchoolPayoutLedgerEntry',
    'SchoolPayout',
    'SchoolFinanceAccount',
    'TeachingSubscription',
    'PaymentTransaction',
    'PaymentMethod',
    'ResourcePurchase',
    'CallSignalEvent',
    'WebhookEvent',
    'Enrollment',
    'Course',
    'School',
    'User'
  ];
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF to_regclass(format('public."%s"', table_name)) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE public."%s" RESTART IDENTITY CASCADE', table_name);
    END IF;
  END LOOP;
END
$$;
SQL

echo "Local auth/account tables cleared successfully."
