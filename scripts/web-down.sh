#!/usr/bin/env bash
set -euo pipefail

# Stops frontend process started by scripts/web-up.sh.

LOG_DIR="${LOG_DIR:-/tmp}"
WEB_PID_FILE="${LOG_DIR}/edamaa-web.pid"

if [ ! -f "$WEB_PID_FILE" ]; then
  echo "Frontend is not running (no pid file)."
  exit 0
fi

WEB_PID="$(cat "$WEB_PID_FILE")"
if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" >/dev/null 2>&1; then
  kill "$WEB_PID" >/dev/null 2>&1 || true
  echo "Stopped frontend (pid=${WEB_PID})"
else
  echo "Frontend is not running (stale pid file removed)"
fi

rm -f "$WEB_PID_FILE"
