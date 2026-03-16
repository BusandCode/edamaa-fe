#!/usr/bin/env bash
set -euo pipefail

# Starts the NestJS API in background mode for frontend development.
# This intentionally skips Django so payment/school pages can work even when
# internal admin services are not needed for the current task.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-3001}"
API_HEALTH_PATH="${API_HEALTH_PATH:-/auth/ready}"
API_COMPAT_PATH="${API_COMPAT_PATH:-/school-finance/me/reminders/health?days=7}"
API_COMPAT_POST_PATH="${API_COMPAT_POST_PATH:-/school-finance/me/reminders/exports/audit}"
API_COMPAT_EXAMS_PATH="${API_COMPAT_EXAMS_PATH:-/school-exams/notifications}"
API_COMPAT_POST_DEV_EMAIL="${API_COMPAT_POST_DEV_EMAIL:-compat.school@edamaa.dev}"
API_COMPAT_POST_DEV_ROLE="${API_COMPAT_POST_DEV_ROLE:-school}"
API_SKIP_PRISMA_CONNECT="${API_SKIP_PRISMA_CONNECT:-1}"
LOG_DIR="${LOG_DIR:-/tmp}"
API_UP_LOCK_DIR="${LOG_DIR}/edamaa-api-up.lock"
API_UP_LOCK_OWNER_FILE="${API_UP_LOCK_DIR}/owner.pid"
LOCK_ACQUIRED=0
NEST_PID_FILE="${LOG_DIR}/edamaa-nestjs.pid"

cd "$ROOT_DIR"

api_health_url="http://${API_HOST}:${API_PORT}${API_HEALTH_PATH}"
api_health_code="$(curl -s -o /dev/null -w '%{http_code}' "$api_health_url" || true)"
if [ "$api_health_code" = "200" ]; then
  compat_url="http://${API_HOST}:${API_PORT}${API_COMPAT_PATH}"
  compat_code="$(curl -s -o /dev/null -w '%{http_code}' "$compat_url" || true)"
  compat_post_url="http://${API_HOST}:${API_PORT}${API_COMPAT_POST_PATH}"
  compat_post_code="$(
    curl -s -o /dev/null -w '%{http_code}' \
      -X POST \
      -H "Content-Type: application/json" \
      -H "x-dev-user-email: ${API_COMPAT_POST_DEV_EMAIL}" \
      -H "x-dev-user-role: ${API_COMPAT_POST_DEV_ROLE}" \
      --data '{"format":"invalid"}' \
      "$compat_post_url" || true
  )"
  compat_exams_url="http://${API_HOST}:${API_PORT}${API_COMPAT_EXAMS_PATH}"
  compat_exams_code="$(
    curl -s -o /dev/null -w '%{http_code}' \
      -H "x-dev-user-email: ${API_COMPAT_POST_DEV_EMAIL}" \
      -H "x-dev-user-role: ${API_COMPAT_POST_DEV_ROLE}" \
      "$compat_exams_url" || true
  )"

  # A 404 on either probe usually means an old/stale NestJS build is running.
  # Non-404 responses (200/201/400/401/403/etc.) are considered route-compatible.
  if [ "$compat_code" != "404" ] && [ "$compat_post_code" != "404" ] && [ "$compat_exams_code" != "404" ]; then
    echo "API already running: http://${API_HOST}:${API_PORT}"
    exit 0
  fi

  echo "API is running but missing one or more compatibility routes."
  echo "GET ${API_COMPAT_PATH} -> ${compat_code}, POST ${API_COMPAT_POST_PATH} -> ${compat_post_code}, GET ${API_COMPAT_EXAMS_PATH} -> ${compat_exams_code}"
  echo "Restarting stale process..."
  stale_pid=""
  if [ -f "$NEST_PID_FILE" ]; then
    stale_pid="$(cat "$NEST_PID_FILE" 2>/dev/null || true)"
  fi

  if [ -n "$stale_pid" ] && kill -0 "$stale_pid" >/dev/null 2>&1; then
    kill "$stale_pid" >/dev/null 2>&1 || true
    for _ in $(seq 1 20); do
      if ! kill -0 "$stale_pid" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
  else
    stale_pids="$(lsof -tiTCP:${API_PORT} -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "$stale_pids" ]; then
      while IFS= read -r pid; do
        if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
          kill "$pid" >/dev/null 2>&1 || true
        fi
      done <<<"$stale_pids"
      sleep 1
    fi
  fi

  if lsof -iTCP:"${API_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Could not reclaim API port ${API_PORT}. Stop the running process and retry." >&2
    lsof -iTCP:"${API_PORT}" -sTCP:LISTEN >&2 || true
    exit 1
  fi
fi

cleanup_lock() {
  if [ "$LOCK_ACQUIRED" = "1" ] && [ -d "$API_UP_LOCK_DIR" ]; then
    rm -f "$API_UP_LOCK_OWNER_FILE" >/dev/null 2>&1 || true
    rmdir "$API_UP_LOCK_DIR" >/dev/null 2>&1 || true
  fi
}

trap cleanup_lock EXIT INT TERM

acquire_lock_or_wait() {
  local attempts=0
  local max_attempts=60

  recover_stale_lock_if_needed() {
    if [ ! -d "$API_UP_LOCK_DIR" ]; then
      return
    fi

    local owner_pid=""
    if [ -f "$API_UP_LOCK_OWNER_FILE" ]; then
      owner_pid="$(cat "$API_UP_LOCK_OWNER_FILE" 2>/dev/null || true)"
    fi

    if [ -n "$owner_pid" ] && kill -0 "$owner_pid" >/dev/null 2>&1; then
      return
    fi

    rm -f "$API_UP_LOCK_OWNER_FILE" >/dev/null 2>&1 || true
    rmdir "$API_UP_LOCK_DIR" >/dev/null 2>&1 || true
  }

  while [ "$attempts" -lt "$max_attempts" ]; do
    recover_stale_lock_if_needed

    if mkdir "$API_UP_LOCK_DIR" >/dev/null 2>&1; then
      LOCK_ACQUIRED=1
      echo "$$" >"$API_UP_LOCK_OWNER_FILE"
      return 0
    fi

    # Another startup is in progress; if it already succeeded, exit cleanly.
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' "$api_health_url" || true)"
    if [ "$code" = "200" ]; then
      echo "API became ready while waiting for startup lock."
      exit 0
    fi

    attempts=$((attempts + 1))
    sleep 1
  done

  echo "Timed out waiting for API startup lock (${API_UP_LOCK_DIR})." >&2
  return 1
}

acquire_lock_or_wait

RUN_SMOKE="${RUN_SMOKE:-0}" \
DETACH=1 \
START_DJANGO=0 \
REQUIRE_DJANGO=0 \
SKIP_PRISMA_CONNECT="${API_SKIP_PRISMA_CONNECT}" \
bash scripts/local-up.sh

api_health_code="$(curl -s -o /dev/null -w '%{http_code}' "$api_health_url" || true)"
if [ "$api_health_code" != "200" ]; then
  echo "API failed to start on ${api_health_url}. See /tmp/edamaa-nestjs.log" >&2
  tail -n 120 /tmp/edamaa-nestjs.log >&2 || true
  exit 1
fi

echo "API ready: http://${API_HOST}:${API_PORT}"
