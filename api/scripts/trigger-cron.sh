#!/usr/bin/env bash
# Manually run the weekly-questions cron and print JSON results.
#
# Usage:
#   export CRON_SECRET='your-secret'
#   export API_URL='http://localhost:3001'   # optional, default below
#   ./scripts/trigger-cron.sh
#
# Or one line:
#   CRON_SECRET=xxx API_URL=https://your-api.onrender.com ./scripts/trigger-cron.sh

set -euo pipefail
API_URL="${API_URL:-http://localhost:3001}"
if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "Set CRON_SECRET (same value as in api/.env or Render)." >&2
  exit 1
fi

# Append ?verbose=1 to see skip reasons when results is empty
RESPONSE="$(curl -sS -X POST "${API_URL}/cron/send-weekly-questions?verbose=1" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json")"

if command -v jq >/dev/null 2>&1; then
  echo "$RESPONSE" | jq .
else
  echo "$RESPONSE"
fi
