#!/usr/bin/env bash
set -euo pipefail

# Background watchdog that keeps the local NestJS API reachable for frontend work.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-3001}"
API_HEALTH_PATH="${API_HEALTH_PATH:-/auth/ready}"
WATCHDOG_INTERVAL_SECONDS="${WATCHDOG_INTERVAL_SECONDS:-5}"
WATCHDOG_LOG_PREFIX="[api-watchdog]"

check_api_health() {
  local url="$1"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
  [ "$code" = "200" ]
}

api_health_url="http://${API_HOST}:${API_PORT}${API_HEALTH_PATH}"

while true; do
  if ! check_api_health "$api_health_url"; then
    echo "${WATCHDOG_LOG_PREFIX} API unavailable on ${api_health_url}. Restarting..."
    if bash "$ROOT_DIR/scripts/api-up.sh"; then
      echo "${WATCHDOG_LOG_PREFIX} API recovered."
    else
      echo "${WATCHDOG_LOG_PREFIX} API restart failed. Will retry."
    fi
  fi
  sleep "$WATCHDOG_INTERVAL_SECONDS"
done
