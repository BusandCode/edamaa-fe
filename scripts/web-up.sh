#!/usr/bin/env bash
set -euo pipefail

# Starts the React/Vite frontend on localhost:5173.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_HOST="${WEB_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-5173}"
VITE_STRICT_PORT="${VITE_STRICT_PORT:-1}"
ENSURE_API="${ENSURE_API:-1}"
API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-3001}"
API_HEALTH_PATH="${API_HEALTH_PATH:-/auth/ready}"
API_WATCHDOG="${API_WATCHDOG:-1}"
LOG_DIR="${LOG_DIR:-/tmp}"
WEB_LOG="${LOG_DIR}/edamaa-web.log"
WEB_PID_FILE="${LOG_DIR}/edamaa-web.pid"
API_WATCHDOG_LOG="${LOG_DIR}/edamaa-api-watchdog.log"
API_WATCHDOG_PID_FILE="${LOG_DIR}/edamaa-api-watchdog.pid"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd npm
require_cmd curl

# Cross-platform port checking functions
is_port_in_use() {
  local port=$1
  if command -v lsof &>/dev/null; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    # Windows with Git Bash
    netstat -ano 2>/dev/null | grep -i "listening" | grep ":$port " >/dev/null 2>&1 || return 1
  else
    # Fallback: assume port not in use if we can't check
    return 1
  fi
}

show_port_info() {
  local port=$1
  if command -v lsof &>/dev/null; then
    lsof -iTCP:"$port" -sTCP:LISTEN || true
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    # Windows: show netstat info
    netstat -ano 2>/dev/null | grep -i "listening" | grep ":$port" || true
  else
    echo "Cannot determine process using port $port"
  fi
}

wait_for_http_200() {
  local name="$1"
  local url="$2"
  local retries="${3:-45}"
  local sleep_seconds="${4:-1}"
  local attempt=1

  while [ "$attempt" -le "$retries" ]; do
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    if [ "$code" = "200" ]; then
      return 0
    fi
    echo "Waiting for ${name} (attempt ${attempt}/${retries}, status=${code})"
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done

  return 1
}

if [ "$ENSURE_API" = "1" ]; then
  API_HEALTH_URL="http://${API_HOST}:${API_PORT}${API_HEALTH_PATH}"
  if ! wait_for_http_200 "backend API" "$API_HEALTH_URL" 2 1; then
    echo "Backend API is not ready on ${API_HEALTH_URL}. Starting NestJS now..."
    bash "$ROOT_DIR/scripts/api-up.sh"
    if ! wait_for_http_200 "backend API" "$API_HEALTH_URL" 60 1; then
      echo "Backend API did not become ready. See /tmp/edamaa-nestjs.log" >&2
      exit 1
    fi
  fi
fi

start_api_watchdog() {
  if [ "$API_WATCHDOG" != "1" ]; then
    return
  fi

  if [ -f "$API_WATCHDOG_PID_FILE" ]; then
    local existing_pid
    existing_pid="$(cat "$API_WATCHDOG_PID_FILE")"
    if [ -n "$existing_pid" ] && kill -0 "$existing_pid" >/dev/null 2>&1; then
      return
    fi
    rm -f "$API_WATCHDOG_PID_FILE"
  fi

  nohup bash "$ROOT_DIR/scripts/api-watchdog.sh" >"$API_WATCHDOG_LOG" 2>&1 &
  local watchdog_pid="$!"
  echo "$watchdog_pid" >"$API_WATCHDOG_PID_FILE"
}

if is_port_in_use "$WEB_PORT"; then
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://${WEB_HOST}:${WEB_PORT}" || true)"
  if [ "$code" = "200" ]; then
    start_api_watchdog
    echo "Frontend already running: http://${WEB_HOST}:${WEB_PORT}"
    exit 0
  fi

  echo "Port ${WEB_PORT} is already in use but not responding with HTTP 200." >&2
  show_port_info "$WEB_PORT" >&2 || true
  echo "Stop the conflicting process, then retry." >&2
  exit 1
fi

cd "$ROOT_DIR"
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund
fi

vite_args=(--host "$WEB_HOST" --port "$WEB_PORT")
if [ "$VITE_STRICT_PORT" = "1" ]; then
  vite_args+=(--strictPort)
fi

nohup npm run dev:ui -- "${vite_args[@]}" >"$WEB_LOG" 2>&1 &
WEB_PID="$!"
echo "$WEB_PID" >"$WEB_PID_FILE"

attempt=1
max_attempts=45
while [ "$attempt" -le "$max_attempts" ]; do
  if ! kill -0 "$WEB_PID" >/dev/null 2>&1; then
    echo "Frontend process exited during startup. See ${WEB_LOG}" >&2
    tail -n 80 "$WEB_LOG" >&2 || true
    exit 1
  fi

  code="$(curl -s -o /dev/null -w '%{http_code}' "http://${WEB_HOST}:${WEB_PORT}" || true)"
  if [ "$code" = "200" ]; then
    break
  fi
  echo "Waiting for frontend (attempt ${attempt}/${max_attempts}, status=${code})"
  attempt=$((attempt + 1))
  sleep 1
done

if [ "$attempt" -gt "$max_attempts" ]; then
  echo "Timed out waiting for frontend on http://${WEB_HOST}:${WEB_PORT}" >&2
  tail -n 80 "$WEB_LOG" >&2 || true
  exit 1
fi

start_api_watchdog

echo "Frontend is ready: http://${WEB_HOST}:${WEB_PORT}"
echo "Log: ${WEB_LOG}"
