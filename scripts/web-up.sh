#!/usr/bin/env bash
set -euo pipefail

# Starts the React/Vite frontend on localhost:5173.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_HOST="${WEB_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-5173}"
VITE_STRICT_PORT="${VITE_STRICT_PORT:-1}"
LOG_DIR="${LOG_DIR:-/tmp}"
WEB_LOG="${LOG_DIR}/edamaa-web.log"
WEB_PID_FILE="${LOG_DIR}/edamaa-web.pid"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd npm
require_cmd curl
require_cmd lsof

if lsof -iTCP:"$WEB_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://${WEB_HOST}:${WEB_PORT}" || true)"
  if [ "$code" = "200" ]; then
    echo "Frontend already running: http://${WEB_HOST}:${WEB_PORT}"
    exit 0
  fi

  echo "Port ${WEB_PORT} is already in use but not responding with HTTP 200." >&2
  lsof -iTCP:"$WEB_PORT" -sTCP:LISTEN >&2 || true
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

nohup npm run dev -- "${vite_args[@]}" >"$WEB_LOG" 2>&1 &
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

echo "Frontend is ready: http://${WEB_HOST}:${WEB_PORT}"
echo "Log: ${WEB_LOG}"
