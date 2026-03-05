#!/usr/bin/env bash
set -euo pipefail

# Full local dev entrypoint.
# - Ensures NestJS API is reachable (auto-starts it when needed)
# - Keeps checking API health and auto-recovers if it drops
# - Starts Vite in the foreground

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-3001}"
API_HEALTH_PATH="${API_HEALTH_PATH:-/auth/ready}"
ENSURE_API="${ENSURE_API:-1}"
API_WATCHDOG="${API_WATCHDOG:-1}"
API_WATCHDOG_INTERVAL_SECONDS="${API_WATCHDOG_INTERVAL_SECONDS:-5}"
WEB_HOST="${WEB_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-5173}"
VITE_STRICT_PORT="${VITE_STRICT_PORT:-1}"
AUTO_RECLAIM_WEB_PORT="${AUTO_RECLAIM_WEB_PORT:-1}"
WATCHDOG_PID=""

check_api_health() {
  local url="$1"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
  [ "$code" = "200" ]
}

start_or_recover_api() {
  local url="$1"
  if check_api_health "$url"; then
    return 0
  fi

  echo "Backend API is not ready on ${url}. Starting it now..."
  if ! bash "$ROOT_DIR/scripts/api-up.sh"; then
    return 1
  fi

  check_api_health "$url"
}

ensure_web_port_is_free() {
  local port="$1"
  if ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    return 0
  fi

  if [ "$AUTO_RECLAIM_WEB_PORT" = "1" ]; then
    local pids
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      echo "Port ${port} is in use. Reclaiming it for Vite..."
      while IFS= read -r pid; do
        if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
          kill "$pid" >/dev/null 2>&1 || true
        fi
      done <<<"$pids"
      sleep 1
      if ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        return 0
      fi
    fi
  fi

  echo "Port ${port} is still busy. Stop the process using it and retry." >&2
  lsof -iTCP:"$port" -sTCP:LISTEN >&2 || true
  return 1
}

cleanup() {
  if [ -n "$WATCHDOG_PID" ] && kill -0 "$WATCHDOG_PID" >/dev/null 2>&1; then
    kill "$WATCHDOG_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

if [ "$ENSURE_API" = "1" ]; then
  api_health_url="http://${API_HOST}:${API_PORT}${API_HEALTH_PATH}"
  if ! start_or_recover_api "$api_health_url"; then
    echo "Backend API is still not reachable on ${api_health_url}." >&2
    echo "Recent backend logs:" >&2
    tail -n 120 /tmp/edamaa-nestjs.log >&2 || true
    exit 1
  fi

  if [ "$API_WATCHDOG" = "1" ]; then
    (
      while true; do
        sleep "$API_WATCHDOG_INTERVAL_SECONDS"
        if ! check_api_health "$api_health_url"; then
          echo "[dev-watchdog] Backend API became unavailable. Restarting..."
          if start_or_recover_api "$api_health_url"; then
            echo "[dev-watchdog] Backend API recovered."
          else
            echo "[dev-watchdog] Backend restart failed. Keeping watchdog active."
          fi
        fi
      done
    ) &
    WATCHDOG_PID="$!"
  fi
fi

cd "$ROOT_DIR"

vite_args=("$@")
if [ "${#vite_args[@]}" -eq 0 ]; then
  if ! ensure_web_port_is_free "$WEB_PORT"; then
    exit 1
  fi

  vite_args=(--host "$WEB_HOST" --port "$WEB_PORT")
  if [ "$VITE_STRICT_PORT" = "1" ]; then
    vite_args+=(--strictPort)
  fi
fi

vite_exit_code=0
npx vite "${vite_args[@]}" || vite_exit_code=$?
exit "$vite_exit_code"
