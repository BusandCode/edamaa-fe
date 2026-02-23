#!/usr/bin/env bash
set -euo pipefail

# Stops services started by scripts/local-up.sh.

LOG_DIR="${LOG_DIR:-/tmp}"
DJANGO_PID_FILE="${LOG_DIR}/edamaa-django.pid"
NEST_PID_FILE="${LOG_DIR}/edamaa-nestjs.pid"

stop_pid_file() {
  local pid_file="$1"
  local name="$2"
  if [ ! -f "$pid_file" ]; then
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    echo "Stopped ${name} (pid=${pid})"
  else
    echo "${name} is not running (stale pid file removed)"
  fi
  rm -f "$pid_file"
}

stop_pid_file "$NEST_PID_FILE" "NestJS"
stop_pid_file "$DJANGO_PID_FILE" "Django"
