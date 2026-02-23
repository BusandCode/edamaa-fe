#!/usr/bin/env bash
set -euo pipefail

# Bootstrap script for the hybrid scaffold.
#
# This script brings up local infra (Redis + optional local Postgres),
# installs dependencies for NestJS and Django, generates Prisma client,
# pushes Prisma schema to DB, runs Django migrations, and starts NestJS.
#
# Run from repo root: `bash scripts/bootstrap.sh`

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "Repo root: $ROOT_DIR"

cd "$ROOT_DIR"

LOCAL_DATABASE_URL="postgresql://postgres:password@localhost:5432/edumaa"
DATABASE_URL="${DATABASE_URL:-}"
DIRECT_URL="${DIRECT_URL:-}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
DJANGO_INTERNAL_API_URL="${DJANGO_INTERNAL_API_URL:-http://localhost:8000/admin-api}"
INTERNAL_API_TOKEN="${INTERNAL_API_TOKEN:-}"

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set; using local Postgres fallback."
  DATABASE_URL="$LOCAL_DATABASE_URL"
fi

if [ -z "$DIRECT_URL" ]; then
  DIRECT_URL="$DATABASE_URL"
fi

USE_LOCAL_DB=0
if [ "$DATABASE_URL" = "$LOCAL_DATABASE_URL" ]; then
  USE_LOCAL_DB=1
fi

if [ $USE_LOCAL_DB -eq 1 ]; then
  echo "Starting docker services (Postgres + Redis)..."
  docker-compose up -d
else
  echo "Starting docker services (Redis only)..."
  docker-compose up -d redis
fi

if [ $USE_LOCAL_DB -eq 1 ]; then
  echo "Waiting for Postgres to accept connections..."
  RETRIES=30
  until docker exec "$(docker-compose ps -q db)" pg_isready -U postgres >/dev/null 2>&1 || [ $RETRIES -le 0 ]; do
    echo "  waiting for postgres... ($RETRIES)"
    sleep 2
    RETRIES=$((RETRIES-1))
  done
  if [ $RETRIES -le 0 ]; then
    echo "Postgres did not start in time. Check docker logs with: docker-compose logs db"
    exit 1
  fi
fi

echo "Setting up NestJS (Prisma)"
cd "$ROOT_DIR/backend/nestjs"
npm install --no-audit --no-fund
export DATABASE_URL
export DIRECT_URL
export REDIS_URL
export DJANGO_INTERNAL_API_URL
export INTERNAL_API_TOKEN
npx prisma generate
if [ "${ALLOW_SCHEMA_PUSH:-0}" = "1" ] || [ $USE_LOCAL_DB -eq 1 ]; then
  npx prisma db push
else
  echo "Skipping prisma db push for external DATABASE_URL. Set ALLOW_SCHEMA_PUSH=1 to enable."
fi

echo "Starting NestJS in background (logs -> /tmp/edumaa-nestjs.log)"
nohup env DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" REDIS_URL="$REDIS_URL" DJANGO_INTERNAL_API_URL="$DJANGO_INTERNAL_API_URL" INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN" npm run start > /tmp/edumaa-nestjs.log 2>&1 &

echo "Setting up Django"
cd "$ROOT_DIR/backend/django"
python3 -m venv .venv || true
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL
export REDIS_URL
export INTERNAL_API_TOKEN
if [ "${ALLOW_SCHEMA_PUSH:-0}" = "1" ] || [ $USE_LOCAL_DB -eq 1 ]; then
  python manage.py migrate
else
  echo "Skipping Django migrate for external DATABASE_URL. Set ALLOW_SCHEMA_PUSH=1 to enable."
fi

echo "Bootstrap complete."
echo "- NestJS: http://localhost:3001 (check /tmp/edumaa-nestjs.log)"
echo "- Django admin: http://localhost:8000/admin (runserver if desired)"
