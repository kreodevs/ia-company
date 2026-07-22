#!/usr/bin/env bash
# Trigger one autonomous workflow cycle via the platform API (CLI bridge for auto-loop.sh users).
#
# Usage:
#   ./scripts/platform/cycle.sh <tenant-slug> <email> <password> [workflow-id|meta]
#
# If the 4th argument is "meta" (default), runs the tenant meta schedule which dynamically
# picks discovery / evaluation / build / growth workflows.
#
# Environment:
#   API_URL  Base API URL (default: http://localhost:3001/api)

set -euo pipefail

TENANT_SLUG="${1:?tenant slug required}"
EMAIL="${2:?email required}"
PASSWORD="${3:?password required}"
MODE="${4:-meta}"
API_URL="${API_URL:-http://localhost:3001/api}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "Logging in as ${EMAIL} @ ${TENANT_SLUG}…"
curl -sf -c "$COOKIE_JAR" -X POST "${API_URL}/auth/tenant/login" \
  -H "Content-Type: application/json" \
  -d "{\"tenantSlug\":\"${TENANT_SLUG}\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  > /dev/null

if [[ "$MODE" == "meta" ]]; then
  echo "Ensuring meta schedule…"
  META_ID="$(curl -sf -b "$COOKIE_JAR" -X POST "${API_URL}/schedules" \
    -H "Content-Type: application/json" \
    -d '{"name":"Autonomous company (meta)","scheduleKind":"meta","intervalSec":1800,"enabled":true}' \
    | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"

  echo "Running meta schedule ${META_ID}…"
  RESPONSE="$(curl -sf -b "$COOKIE_JAR" -X POST "${API_URL}/schedules/${META_ID}/run-now")"
else
  WORKFLOW_ID="$MODE"
  echo "Executing workflow ${WORKFLOW_ID} with consensus sync…"
  RESPONSE="$(curl -sf -b "$COOKIE_JAR" -X POST "${API_URL}/workflows/${WORKFLOW_ID}/execute" \
    -H "Content-Type: application/json" \
    -d '{"mergeConsensus":true,"syncConsensus":true}')"
fi

RUN_ID="$(echo "$RESPONSE" | sed -n 's/.*"runId":"\([^"]*\)".*/\1/p')"
echo "Run started: ${RUN_ID}"
echo "Stream logs: ${API_URL}/runs/${RUN_ID}/logs"
