#!/usr/bin/env bash
# Trigger one autonomous workflow cycle via the platform API (CLI bridge for auto-loop.sh users).
#
# Usage:
#   ./scripts/platform/cycle.sh <tenant-slug> <email> <password> <workflow-id>
#
# Environment:
#   API_URL  Base API URL (default: http://localhost:3001/api)

set -euo pipefail

TENANT_SLUG="${1:?tenant slug required}"
EMAIL="${2:?email required}"
PASSWORD="${3:?password required}"
WORKFLOW_ID="${4:?workflow id required}"
API_URL="${API_URL:-http://localhost:3001/api}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "Logging in as ${EMAIL} @ ${TENANT_SLUG}…"
curl -sf -c "$COOKIE_JAR" -X POST "${API_URL}/auth/tenant/login" \
  -H "Content-Type: application/json" \
  -d "{\"tenantSlug\":\"${TENANT_SLUG}\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  > /dev/null

echo "Executing workflow ${WORKFLOW_ID} with consensus sync…"
RESPONSE="$(curl -sf -b "$COOKIE_JAR" -X POST "${API_URL}/workflows/${WORKFLOW_ID}/execute" \
  -H "Content-Type: application/json" \
  -d '{"mergeConsensus":true,"syncConsensus":true}')"

RUN_ID="$(echo "$RESPONSE" | sed -n 's/.*"runId":"\([^"]*\)".*/\1/p')"
echo "Run started: ${RUN_ID}"
echo "Stream logs: ${API_URL}/runs/${RUN_ID}/logs"
