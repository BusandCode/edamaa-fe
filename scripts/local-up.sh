#!/usr/bin/env bash
set -euo pipefail

# One-command local runner for backend services.
# - Starts NestJS API on :3001 (always)
# - Starts Django admin API on :8000 when START_DJANGO=1
# - Optionally runs the internal bridge smoke check when Django is up
# - Keeps started processes attached until Ctrl+C unless DETACH=1

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

DJANGO_HOST="${DJANGO_HOST:-127.0.0.1}"
DJANGO_PORT="${DJANGO_PORT:-8000}"
NEST_HOST="${NEST_HOST:-127.0.0.1}"
NEST_PORT="${NEST_PORT:-3001}"
START_DJANGO="${START_DJANGO:-1}"
REQUIRE_DJANGO="${REQUIRE_DJANGO:-0}"

INTERNAL_API_TOKEN="${INTERNAL_API_TOKEN:-}"
DATABASE_URL="${DATABASE_URL:-}"
DIRECT_URL="${DIRECT_URL:-}"
REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
DJANGO_INTERNAL_API_URL="${DJANGO_INTERNAL_API_URL:-http://${DJANGO_HOST}:${DJANGO_PORT}/admin-api}"
NEST_ENV_FILE="${ROOT_DIR}/backend/nestjs/.env"

# Redis/queue defaults stay in lightweight mode for local frontend work.
# Prisma connect defaults to enabled so finance/payments features work.
# Auto db push is disabled by default because the local database is shared with
# Django tables and `prisma db push` can become destructive.
SKIP_PRISMA_CONNECT="${SKIP_PRISMA_CONNECT:-0}"
SKIP_REDIS_CONNECT="${SKIP_REDIS_CONNECT:-1}"
SKIP_QUEUE_CONNECT="${SKIP_QUEUE_CONNECT:-1}"
DISABLE_QUEUES_UI="${DISABLE_QUEUES_UI:-1}"
PRISMA_DB_PUSH="${PRISMA_DB_PUSH:-0}"

RUN_SMOKE="${RUN_SMOKE:-1}"
DETACH="${DETACH:-0}"
AUTO_RECLAIM_PORTS="${AUTO_RECLAIM_PORTS:-1}"
AUTO_START_LOCAL_INFRA="${AUTO_START_LOCAL_INFRA:-1}"
LOCAL_DB_STARTUP_TIMEOUT_SECONDS="${LOCAL_DB_STARTUP_TIMEOUT_SECONDS:-45}"
LOCAL_REDIS_STARTUP_TIMEOUT_SECONDS="${LOCAL_REDIS_STARTUP_TIMEOUT_SECONDS:-30}"
DOCKER_STARTUP_WAIT_SECONDS="${DOCKER_STARTUP_WAIT_SECONDS:-120}"

LOG_DIR="${LOG_DIR:-/tmp}"
DJANGO_LOG="${LOG_DIR}/edamaa-django.log"
NEST_LOG="${LOG_DIR}/edamaa-nestjs.log"
NEST_BUILD_LOG="${LOG_DIR}/edamaa-nestjs-build.log"
NEST_PRISMA_PUSH_LOG="${LOG_DIR}/edamaa-prisma-push.log"
DJANGO_MIGRATE_LOG="${LOG_DIR}/edamaa-django-migrate.log"
DJANGO_PID_FILE="${LOG_DIR}/edamaa-django.pid"
NEST_PID_FILE="${LOG_DIR}/edamaa-nestjs.pid"
NEST_STARTUP_HEALTH_PATH="${NEST_STARTUP_HEALTH_PATH:-}"

DJANGO_PID=""
NEST_PID=""
DJANGO_READY="0"

read_env_file_value() {
  local key="$1"
  local file_path="$2"

  if [ ! -f "$file_path" ]; then
    return
  fi

  # Read the last matching KEY=value assignment from env file.
  local raw
  raw="$(awk -F= -v k="$key" '$1==k {print substr($0, index($0, "=") + 1)}' "$file_path" | tail -n 1)"
  raw="$(printf '%s' "$raw" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

  if [ -z "$raw" ]; then
    return
  fi

  if [ "${raw#\"}" != "$raw" ] && [ "${raw%\"}" != "$raw" ]; then
    raw="${raw#\"}"
    raw="${raw%\"}"
  elif [ "${raw#\'}" != "$raw" ] && [ "${raw%\'}" != "$raw" ]; then
    raw="${raw#\'}"
    raw="${raw%\'}"
  fi

  printf '%s' "$raw"
}

if [ -z "$DATABASE_URL" ]; then
  DATABASE_URL="$(read_env_file_value "DATABASE_URL" "$NEST_ENV_FILE")"
fi

if [ -z "$DIRECT_URL" ]; then
  DIRECT_URL="$(read_env_file_value "DIRECT_URL" "$NEST_ENV_FILE")"
fi

if [ -z "$INTERNAL_API_TOKEN" ]; then
  INTERNAL_API_TOKEN="$(read_env_file_value "INTERNAL_API_TOKEN" "$NEST_ENV_FILE")"
fi

if [ -z "$DATABASE_URL" ]; then
  DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/edamaa"
fi

if [ -z "$DIRECT_URL" ]; then
  DIRECT_URL="$DATABASE_URL"
fi

if [ -z "$INTERNAL_API_TOKEN" ]; then
  INTERNAL_API_TOKEN="local-internal-token"
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

run_with_timeout() {
  local timeout_seconds="$1"
  shift

  "$@" &
  local command_pid="$!"
  local elapsed=0

  while kill -0 "$command_pid" >/dev/null 2>&1; do
    if [ "$elapsed" -ge "$timeout_seconds" ]; then
      kill "$command_pid" >/dev/null 2>&1 || true
      sleep 1
      kill -9 "$command_pid" >/dev/null 2>&1 || true
      wait "$command_pid" >/dev/null 2>&1 || true
      return 124
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  wait "$command_pid"
}

pick_latest_installed_formula() {
  local pattern="$1"
  local formula

  formula="$(
    brew list --formula 2>/dev/null \
      | grep -E "$pattern" \
      | sort -V \
      | tail -n 1 || true
  )"

  printf '%s' "$formula"
}

start_brew_service_if_installed() {
  local service_label="$1"
  local formula="$2"
  local port="$3"
  local timeout_seconds="$4"

  if [ -z "$formula" ]; then
    return 1
  fi

  echo "Starting ${service_label} using Homebrew service (${formula})..."
  HOMEBREW_NO_AUTO_UPDATE=1 brew services start "$formula" >/dev/null 2>&1 || true
  wait_for_port_listen "$service_label" "$port" "$timeout_seconds" 1
}

try_start_brew_infra_if_needed() {
  local need_local_db="$1"
  local need_local_redis="$2"
  local db_port="$3"
  local redis_port="$4"

  if [ "$(uname -s)" != "Darwin" ]; then
    return 1
  fi

  if ! command -v brew >/dev/null 2>&1; then
    return 1
  fi

  local attempted="0"
  local unresolved="0"

  if [ "$need_local_db" = "1" ]; then
    attempted="1"
    local postgres_formula
    postgres_formula="$(pick_latest_installed_formula '^postgresql(@[0-9]+)?$')"
    if ! start_brew_service_if_installed "Postgres" "$postgres_formula" "$db_port" "$LOCAL_DB_STARTUP_TIMEOUT_SECONDS"; then
      unresolved="1"
    fi
  fi

  if [ "$need_local_redis" = "1" ]; then
    attempted="1"
    local redis_formula
    redis_formula="$(pick_latest_installed_formula '^redis(@[0-9.]+)?$')"
    if ! start_brew_service_if_installed "Redis" "$redis_formula" "$redis_port" "$LOCAL_REDIS_STARTUP_TIMEOUT_SECONDS"; then
      unresolved="1"
    fi
  fi

  if [ "$attempted" = "1" ] && [ "$unresolved" = "0" ]; then
    return 0
  fi

  return 1
}

start_docker_desktop_if_possible() {
  # Best-effort: auto-open Docker Desktop on macOS for local onboarding.
  if [ "$(uname -s)" != "Darwin" ]; then
    return
  fi
  if ! command -v open >/dev/null 2>&1; then
    return
  fi
  if [ ! -d "/Applications/Docker.app" ]; then
    return
  fi
  open -a Docker >/dev/null 2>&1 || true
}

wait_for_docker_daemon() {
  local max_wait="$1"
  local elapsed=0
  local poll_interval=2

  while [ "$elapsed" -lt "$max_wait" ]; do
    if run_with_timeout 8 env DOCKER_CLIENT_TIMEOUT=8 COMPOSE_HTTP_TIMEOUT=8 docker info >/dev/null 2>&1; then
      return 0
    fi
    if [ "$elapsed" = "0" ]; then
      echo "Waiting for Docker daemon..."
    fi
    sleep "$poll_interval"
    elapsed=$((elapsed + poll_interval))
  done

  return 1
}

is_local_host() {
  local host="${1:-}"
  case "$host" in
    "" | "localhost" | "127.0.0.1" | "0.0.0.0" | "::1")
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

extract_host_from_url() {
  local value="${1:-}"
  local without_scheme="${value#*://}"
  local host_port_path="${without_scheme##*@}"
  local host_port="${host_port_path%%/*}"
  if [ -z "$host_port" ]; then
    return
  fi
  printf '%s' "${host_port%%:*}"
}

extract_port_from_url() {
  local value="${1:-}"
  local default_port="${2:-}"
  local without_scheme="${value#*://}"
  local host_port_path="${without_scheme##*@}"
  local host_port="${host_port_path%%/*}"
  if [ -z "$host_port" ]; then
    printf '%s' "$default_port"
    return
  fi
  if [ "$host_port" = "${host_port%%:*}" ]; then
    printf '%s' "$default_port"
    return
  fi
  printf '%s' "${host_port##*:}"
}

wait_for_port_listen() {
  local name="$1"
  local port="$2"
  local retries="$3"
  local sleep_seconds="${4:-1}"
  local attempt=1

  while [ "$attempt" -le "$retries" ]; do
    if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
    echo "Waiting for ${name} on port ${port} (attempt ${attempt}/${retries})"
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done

  return 1
}

ensure_local_infra_if_needed() {
  if [ "$AUTO_START_LOCAL_INFRA" != "1" ]; then
    return
  fi

  local db_host
  db_host="$(extract_host_from_url "$DATABASE_URL")"
  local db_port
  db_port="$(extract_port_from_url "$DATABASE_URL" "5432")"

  local redis_host
  redis_host="$(extract_host_from_url "$REDIS_URL")"
  local redis_port
  redis_port="$(extract_port_from_url "$REDIS_URL" "6379")"

  local need_local_db="0"
  local need_local_redis="0"

  if [ "$SKIP_PRISMA_CONNECT" != "1" ] && is_local_host "$db_host"; then
    if ! lsof -iTCP:"$db_port" -sTCP:LISTEN >/dev/null 2>&1; then
      need_local_db="1"
    fi
  fi

  if [ "$SKIP_REDIS_CONNECT" != "1" ] && is_local_host "$redis_host"; then
    if ! lsof -iTCP:"$redis_port" -sTCP:LISTEN >/dev/null 2>&1; then
      need_local_redis="1"
    fi
  fi

  if [ "$need_local_db" = "0" ] && [ "$need_local_redis" = "0" ]; then
    return
  fi

  if try_start_brew_infra_if_needed "$need_local_db" "$need_local_redis" "$db_port" "$redis_port"; then
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "Local infra is missing and Docker is not available." >&2
    echo "Install/start one of these options, then retry:" >&2
    echo "1) Homebrew services: brew install postgresql@14 redis && brew services start postgresql@14 && brew services start redis" >&2
    echo "2) Docker Desktop: install Docker Desktop and keep it running" >&2
    exit 1
  fi

  start_docker_desktop_if_possible
  if ! wait_for_docker_daemon "$DOCKER_STARTUP_WAIT_SECONDS"; then
    echo "Docker daemon is not available." >&2
    echo "Use one of these options, then retry:" >&2
    echo "1) Start Docker Desktop and wait until it is ready" >&2
    echo "2) Install/start Homebrew services: brew install postgresql@14 redis && brew services start postgresql@14 && brew services start redis" >&2
    exit 1
  fi

  echo "Starting local infra via docker compose (db/redis)..."
  if ! run_with_timeout 20 env DOCKER_CLIENT_TIMEOUT=10 COMPOSE_HTTP_TIMEOUT=10 docker compose up -d db redis >/dev/null 2>&1; then
    echo "Failed to start docker compose services (db/redis)." >&2
    exit 1
  fi

  if [ "$need_local_db" = "1" ]; then
    if ! wait_for_port_listen "Postgres" "$db_port" "$LOCAL_DB_STARTUP_TIMEOUT_SECONDS" 1; then
      echo "Postgres did not become ready on port ${db_port}." >&2
      exit 1
    fi
  fi

  if [ "$need_local_redis" = "1" ]; then
    if ! wait_for_port_listen "Redis" "$redis_port" "$LOCAL_REDIS_STARTUP_TIMEOUT_SECONDS" 1; then
      echo "Redis did not become ready on port ${redis_port}." >&2
      exit 1
    fi
  fi
}

assert_port_free() {
  local port="$1"
  local service_name="$2"

  if ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    return
  fi

  if [ "$AUTO_RECLAIM_PORTS" = "1" ]; then
    local pids
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      echo "Port $port is busy. Reclaiming it for ${service_name}..."
      # Split newline-separated PIDs safely.
      while IFS= read -r pid; do
        if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
          kill "$pid" >/dev/null 2>&1 || true
        fi
      done <<<"$pids"

      sleep 1
      if ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        return
      fi

      # Graceful stop failed; force kill any remaining listeners.
      pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
      if [ -n "$pids" ]; then
        while IFS= read -r pid; do
          if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
            kill -9 "$pid" >/dev/null 2>&1 || true
          fi
        done <<<"$pids"
      fi

      sleep 1
      if ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        return
      fi
    fi
  fi

  echo "Port $port is already in use. Stop the existing process first." >&2
  lsof -iTCP:"$port" -sTCP:LISTEN >&2 || true
  exit 1
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

if [ -z "$NEST_STARTUP_HEALTH_PATH" ]; then
  if [ "$SKIP_PRISMA_CONNECT" = "1" ]; then
    NEST_STARTUP_HEALTH_PATH="/auth/health"
  else
    NEST_STARTUP_HEALTH_PATH="/auth/ready"
  fi
fi

require_cmd curl
require_cmd lsof
require_cmd npm
ensure_local_infra_if_needed

if [ "$START_DJANGO" = "1" ]; then
  require_cmd python3
  assert_port_free "$DJANGO_PORT" "Django"
fi
assert_port_free "$NEST_PORT" "NestJS"

echo "Starting local backend stack from ${ROOT_DIR}"
echo "Logs: ${DJANGO_LOG}, ${NEST_LOG}"

if [ "$START_DJANGO" = "1" ]; then
  cd "$ROOT_DIR/backend/django"
  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
  fi

  # shellcheck disable=SC1091
  source .venv/bin/activate
  if ! python -c "import django" >/dev/null 2>&1; then
    pip install -r requirements.txt
  fi

  env -u CODEX_SANDBOX_NETWORK_DISABLED \
    INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN" DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL" \
    python manage.py migrate --noinput >"$DJANGO_MIGRATE_LOG" 2>&1 || {
    echo "Django migrate failed. See ${DJANGO_MIGRATE_LOG}" >&2
    tail -n 80 "$DJANGO_MIGRATE_LOG" >&2 || true
    if [ "$REQUIRE_DJANGO" = "1" ]; then
      exit 1
    fi
    echo "Continuing without Django because REQUIRE_DJANGO=0"
    START_DJANGO="0"
  }

  if [ "$START_DJANGO" = "1" ]; then
    # Use nohup so detached mode keeps services alive after this shell exits.
    env -u CODEX_SANDBOX_NETWORK_DISABLED \
      INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN" DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL" \
      nohup python manage.py runserver "${DJANGO_HOST}:${DJANGO_PORT}" --noreload >"$DJANGO_LOG" 2>&1 &
    DJANGO_PID="$!"
    echo "$DJANGO_PID" >"$DJANGO_PID_FILE"

    if wait_for_http_200 \
      "Django admin API" \
      "http://${DJANGO_HOST}:${DJANGO_PORT}/admin-api/health/" \
      "X-Internal-Token: ${INTERNAL_API_TOKEN}" \
      45 \
      1 \
      "$DJANGO_PID"; then
      DJANGO_READY="1"
    else
      echo "Django did not become ready. See ${DJANGO_LOG}" >&2
      tail -n 120 "$DJANGO_LOG" >&2 || true
      if [ "$REQUIRE_DJANGO" = "1" ]; then
        exit 1
      fi
      echo "Continuing with NestJS only because REQUIRE_DJANGO=0"
      DJANGO_READY="0"
      if [ -f "$DJANGO_PID_FILE" ]; then
        rm -f "$DJANGO_PID_FILE"
      fi
      if [ -n "$DJANGO_PID" ] && kill -0 "$DJANGO_PID" >/dev/null 2>&1; then
        kill "$DJANGO_PID" >/dev/null 2>&1 || true
      fi
      DJANGO_PID=""
    fi
  fi
fi

cd "$ROOT_DIR/backend/nestjs"
if [ ! -d "node_modules" ]; then
  npm install --no-audit --no-fund
fi

if [ "$SKIP_PRISMA_CONNECT" != "1" ] && [ "$PRISMA_DB_PUSH" = "1" ]; then
  npx prisma db push >"$NEST_PRISMA_PUSH_LOG" 2>&1 || {
    echo "Prisma db push failed. See ${NEST_PRISMA_PUSH_LOG}" >&2
    tail -n 120 "$NEST_PRISMA_PUSH_LOG" >&2 || true
    exit 1
  }
fi

npm run build >"$NEST_BUILD_LOG" 2>&1 || {
  echo "NestJS build failed. See ${NEST_BUILD_LOG}" >&2
  tail -n 120 "$NEST_BUILD_LOG" >&2 || true
  exit 1
}

env -u CODEX_SANDBOX_NETWORK_DISABLED \
  INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN" \
  HOST="$NEST_HOST" \
  PORT="$NEST_PORT" \
  DATABASE_URL="$DATABASE_URL" \
  DIRECT_URL="$DIRECT_URL" \
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
  "NestJS readiness" \
  "http://${NEST_HOST}:${NEST_PORT}${NEST_STARTUP_HEALTH_PATH}" \
  "" \
  180 \
  1 \
  "$NEST_PID" || {
  tail -n 120 "$NEST_LOG" >&2 || true
  exit 1
}

if [ "$RUN_SMOKE" = "1" ] && [ "$DJANGO_READY" = "1" ]; then
  echo "Running bridge smoke check..."
  INTERNAL_API_TOKEN="$INTERNAL_API_TOKEN" \
    NEST_BASE_URL="http://${NEST_HOST}:${NEST_PORT}" \
    bash "$ROOT_DIR/scripts/smoke_internal_bridge.sh"
elif [ "$RUN_SMOKE" = "1" ]; then
  echo "Skipping bridge smoke check because Django is not ready."
fi

echo
echo "Local backend is ready:"
echo "- NestJS: http://${NEST_HOST}:${NEST_PORT}"
if [ "$DJANGO_READY" = "1" ]; then
  echo "- Django: http://${DJANGO_HOST}:${DJANGO_PORT}/admin/"
else
echo "- Django: not running (START_DJANGO=${START_DJANGO}, REQUIRE_DJANGO=${REQUIRE_DJANGO})"
fi
echo "- Nest auth health: http://${NEST_HOST}:${NEST_PORT}/auth/health"
echo "- Nest readiness: http://${NEST_HOST}:${NEST_PORT}/auth/ready"
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
  django_pid_display="n/a"
  nest_pid_display="n/a"
  if [ -f "$DJANGO_PID_FILE" ]; then
    django_pid_display="$(cat "$DJANGO_PID_FILE" 2>/dev/null || echo "n/a")"
  fi
  if [ -f "$NEST_PID_FILE" ]; then
    nest_pid_display="$(cat "$NEST_PID_FILE" 2>/dev/null || echo "n/a")"
  fi
  echo "PIDs: Django=${django_pid_display}, Nest=${nest_pid_display}"
  exit 0
fi

echo "Press Ctrl+C to stop both services."
live_pids=()
if [ -n "$DJANGO_PID" ]; then
  live_pids+=("$DJANGO_PID")
fi
if [ -n "$NEST_PID" ]; then
  live_pids+=("$NEST_PID")
fi

if ! wait -n "${live_pids[@]}"; then
  echo "A service exited with an error. Recent logs:" >&2
  if [ "$DJANGO_READY" = "1" ]; then
    echo "--- Django ---" >&2
    tail -n 80 "$DJANGO_LOG" >&2 || true
  fi
  echo "--- NestJS ---" >&2
  tail -n 80 "$NEST_LOG" >&2 || true
  exit 1
fi
