#!/usr/bin/env bash
set -euo pipefail

# One-command local runner for backend services.
# - Starts Django admin API on :8000
# - Builds and starts NestJS API on :3001
# - Waits for both services and runs the internal bridge smoke check
# - Keeps both processes attached until Ctrl+C

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

DJANGO_HOST="${DJANGO_HOST:-127.0.0.1}"
DJANGO_PORT="${DJANGO_PORT:-8000}"
NEST_HOST="${NEST_HOST:-127.0.0.1}"
NEST_PORT="${NEST_PORT:-3001}"

INTERNAL_API_TOKEN="${INTERNAL_API_TOKEN:-local-internal-token}"
DATABASE_URL="${DATABASE_URL:-sqlite:////tmp/edamaa-local.db}"
REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
DJANGO_INTERNAL_API_URL="${DJANGO_INTERNAL_API_URL:-http://${DJANGO_HOST}:${DJANGO_PORT}/admin-api}"

# Local smoke defaults intentionally avoid hard deps on Postgres/Redis.
SKIP_PRISMA_CONNECT="${SKIP_PRISMA_CONNECT:-1}"
SKIP_REDIS_CONNECT="${SKIP_REDIS_CONNECT:-1}"
SKIP_QUEUE_CONNECT="${SKIP_QUEUE_CONNECT:-1}"
DISABLE_QUEUES_UI="${DISABLE_QUEUES_UI:-1}"

RUN_SMOKE="${RUN_SMOKE:-1}"
DETACH="${DETACH:-0}"

LOG_DIR="${LOG_DIR:-/tmp}"
DJANGO_LOG="${LOG_DIR}/edamaa-django.log"
NEST_LOG="${LOG_DIR}/edamaa-nestjs.log"
NEST_BUILD_LOG="${LOG_DIR}/edamaa-nestjs-build.log"
DJANGO_MIGRATE_LOG="${LOG_DIR}/edamaa-django-migrate.log"
DJANGO_PID_FILE="${LOG_DIR}/edamaa-django.pid"
NEST_PID_FILE="${LOG_DIR}/edamaa-nestjs.pid"

DJANGO_PID=""
NEST_PID=""

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

assert_port_free() {
  local port="$1"
  if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Stop the existing process first." >&2
    lsof -iTCP:"$port" -sTCP:LISTEN >&2 || true
    exit 1
  fi
}

wait_for_http_200() {
  local name="$1"
  local url="$2"
  local header="${3:-}"
  local retries="${4:-40}"
  local sleep_seconds="${5:-1}"
  local pid="${6:-}"
  local attempt=1

  while [ "$attempt" -le "$retries" ]; do
    if [ -n "$pid" ] && ! kill -0 "$pid" >/dev/null 2>&1; then
      echo "${name} process exited during startup (pid=${pid})" >&2
      return 2
    fi

    local code
    if [ -n "$header" ]; then
      code="$(curl -s -o /dev/null -w '%{http_code}' -H "$header" "$url" || true)"
    else
      code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    fi

    if [ "$code" = "200" ]; then
      return 0
    fi

    echo "Waiting for ${name} (attempt ${attempt}/${retries}, status=${code})"
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done

  echo "Timed out waiting for ${name}: ${url}" >&2
  return 1
}

stop_services() {
  if [ -n "${NEST_PID:-}" ] && kill -0 "$NEST_PID" >/dev/null 2>&1; then
    kill "$NEST_PID" >/dev/null 2>&1 || true
  elif [ -f "$NEST_PID_FILE" ]; then
    kill "$(cat "$NEST_PID_FILE")" >/dev/null 2>&1 || true
  fi

  if [ -n "${DJANGO_PID:-}" ] && kill -0 "$DJANGO_PID" >/dev/null 2>&1; then
    kill "$DJANGO_PID" >/dev/null 2>&1 || true
  elif [ -f "$DJANGO_PID_FILE" ]; then
    kill "$(cat "$DJANGO_PID_FILE")" >/dev/null 2>&1 || true
  fi

  rm -f "$NEST_PID_FILE" "$DJANGO_PID_FILE"
}

on_exit() {
  if [ "$DETACH" = "1" ]; then
    return
  fi
  stop_services
}

trap on_exit EXIT INT TERM

require_cmd curl
require_cmd lsof
require_cmd npm
require_cmd python3

assert_port_free "$DJANGO_PORT"
assert_port_free "$NEST_PORT"

echo "Starting local backend stack from ${ROOT_DIR}"
echo "Logs: ${DJANGO_LOG}, ${NEST_LOG}"

cd "$ROOT_DIR/backend/django"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate
if ! python -c "import django" >/dev/null 2>&1; then
  pip install -r requirements.txt
fi

INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN" DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL" \
  python manage.py migrate --noinput >"$DJANGO_MIGRATE_LOG" 2>&1 || {
  echo "Django migrate failed. See ${DJANGO_MIGRATE_LOG}" >&2
  tail -n 80 "$DJANGO_MIGRATE_LOG" >&2 || true
  exit 1
}

# Use nohup so detached mode keeps services alive after this shell exits.
INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN" DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL" \
  nohup python manage.py runserver "${DJANGO_HOST}:${DJANGO_PORT}" --noreload >"$DJANGO_LOG" 2>&1 &
DJANGO_PID="$!"
echo "$DJANGO_PID" >"$DJANGO_PID_FILE"

wait_for_http_200 \
  "Django admin API" \
  "http://${DJANGO_HOST}:${DJANGO_PORT}/admin-api/health/" \
  "X-Internal-Token: ${INTERNAL_API_TOKEN}" \
  45 \
  1 \
  "$DJANGO_PID" || {
  tail -n 120 "$DJANGO_LOG" >&2 || true
  exit 1
}

cd "$ROOT_DIR/backend/nestjs"
if [ ! -d "node_modules" ]; then
  npm install --no-audit --no-fund
fi

npm run build >"$NEST_BUILD_LOG" 2>&1 || {
  echo "NestJS build failed. See ${NEST_BUILD_LOG}" >&2
  tail -n 120 "$NEST_BUILD_LOG" >&2 || true
  exit 1
}

INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN" \
  DJANGO_INTERNAL_API_URL="$DJANGO_INTERNAL_API_URL" \
  REDIS_URL="$REDIS_URL" \
  SKIP_PRISMA_CONNECT="$SKIP_PRISMA_CONNECT" \
  SKIP_REDIS_CONNECT="$SKIP_REDIS_CONNECT" \
  SKIP_QUEUE_CONNECT="$SKIP_QUEUE_CONNECT" \
  DISABLE_QUEUES_UI="$DISABLE_QUEUES_UI" \
  nohup node dist/main.js >"$NEST_LOG" 2>&1 &
NEST_PID="$!"
echo "$NEST_PID" >"$NEST_PID_FILE"

wait_for_http_200 \
  "NestJS internal admin proxy health" \
  "http://${NEST_HOST}:${NEST_PORT}/internal/admin/proxy-health" \
  "X-Internal-Token: ${INTERNAL_API_TOKEN}" \
  60 \
  1 \
  "$NEST_PID" || {
  tail -n 120 "$NEST_LOG" >&2 || true
  exit 1
}

if [ "$RUN_SMOKE" = "1" ]; then
  echo "Running bridge smoke check..."
  INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN" \
    NEST_BASE_URL="http://${NEST_HOST}:${NEST_PORT}" \
    bash "$ROOT_DIR/scripts/smoke_internal_bridge.sh"
fi

echo
echo "Local backend is ready:"
echo "- NestJS: http://${NEST_HOST}:${NEST_PORT}"
echo "- Django: http://${DJANGO_HOST}:${DJANGO_PORT}/admin/"
echo "- Nest auth health: http://${NEST_HOST}:${NEST_PORT}/auth/health"
echo "- Nest realtime health: http://${NEST_HOST}:${NEST_PORT}/realtime/health"
echo "- Frontend (run separately): make web-up  ->  http://127.0.0.1:5173"
echo "- Bridge proxy health (token required):"
echo "  curl -H \"X-Internal-Token: ${INTERNAL_API_TOKEN}\" http://${NEST_HOST}:${NEST_PORT}/internal/admin/proxy-health"
echo
echo "Logs:"
echo "- ${DJANGO_LOG}"
echo "- ${NEST_LOG}"

if [ "$DETACH" = "1" ]; then
  trap - EXIT INT TERM
  echo "Services are running in background."
  echo "PIDs: Django=$(cat "$DJANGO_PID_FILE"), Nest=$(cat "$NEST_PID_FILE")"
  exit 0
fi

echo "Press Ctrl+C to stop both services."
if ! wait -n "$DJANGO_PID" "$NEST_PID"; then
  echo "A service exited with an error. Recent logs:" >&2
  echo "--- Django ---" >&2
  tail -n 80 "$DJANGO_LOG" >&2 || true
  echo "--- NestJS ---" >&2
  tail -n 80 "$NEST_LOG" >&2 || true
  exit 1
fi
