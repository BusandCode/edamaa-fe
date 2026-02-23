#!/usr/bin/env bash
set -euo pipefail

NEST_BASE_URL="${NEST_BASE_URL:-http://127.0.0.1:3001}"
INTERNAL_API_TOKEN="${INTERNAL_API_TOKEN:-}"
RETRIES="${SMOKE_RETRIES:-30}"
SLEEP_SECONDS="${SMOKE_SLEEP_SECONDS:-2}"

if [ -z "$INTERNAL_API_TOKEN" ]; then
  echo "INTERNAL_API_TOKEN must be set for smoke test." >&2
  exit 1
fi

http_code() {
  local url="$1"
  curl -s -o /dev/null -w '%{http_code}' \
    -H "X-Internal-Token: $INTERNAL_API_TOKEN" \
    "$url" || true
}

wait_for_ready() {
  local url="$1"
  local attempt=1
  while [ "$attempt" -le "$RETRIES" ]; do
    local code
    code="$(http_code "$url")"
    if [ "$code" = "200" ]; then
      return 0
    fi
    echo "Waiting for $url (attempt $attempt/$RETRIES, status=$code)..."
    attempt=$((attempt + 1))
    sleep "$SLEEP_SECONDS"
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

assert_json() {
  local json_payload="$1"
  local check_name="$2"
  local check_expr="$3"

  python3 -c "import json,sys; data=json.loads(sys.argv[1]); assert ($check_expr), 'check failed'; print('ok')" \
    "$json_payload" >/dev/null || {
    echo "Smoke assertion failed: $check_name" >&2
    echo "Payload: $json_payload" >&2
    exit 1
  }
}

echo "Running internal bridge smoke test against $NEST_BASE_URL"

# Wait until NestJS can authenticate and report bridge readiness before
# asserting deeper routes. This reduces flaky startup races in CI.
wait_for_ready "$NEST_BASE_URL/internal/admin/proxy-health"

proxy_health="$(curl -fsS -H "X-Internal-Token: $INTERNAL_API_TOKEN" "$NEST_BASE_URL/internal/admin/proxy-health")"
assert_json "$proxy_health" "proxy-health provider/config" "data.get('provider') == 'django-admin-api' and data.get('configured') is True"

django_health="$(curl -fsS -H "X-Internal-Token: $INTERNAL_API_TOKEN" "$NEST_BASE_URL/internal/admin/health")"
assert_json "$django_health" "django health shape" "data.get('status') == 'ok' and data.get('service') == 'django-admin-api'"

webhook_analytics="$(curl -fsS -H "X-Internal-Token: $INTERNAL_API_TOKEN" "$NEST_BASE_URL/internal/admin/analytics/webhooks")"
assert_json "$webhook_analytics" "webhook analytics shape" "'webhook_events' in data and all(k in data['webhook_events'] for k in ('total','processed','pending'))"

user_role_analytics="$(curl -fsS -H "X-Internal-Token: $INTERNAL_API_TOKEN" "$NEST_BASE_URL/internal/admin/analytics/user-roles")"
assert_json "$user_role_analytics" "user role analytics shape" "'users_by_role' in data and isinstance(data['users_by_role'], dict)"

echo "Smoke test passed: NestJS internal bridge -> Django admin API."
