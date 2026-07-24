#!/bin/sh
set -e

DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}…"
i=0
while [ "$i" -lt 60 ]; do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  sleep 1
done

if ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
  echo "ERROR: PostgreSQL not reachable"
  exit 1
fi

# Custom command (e.g. worker) — skip migrations/seed and do not start the API.
if [ "$#" -gt 0 ]; then
  echo "Starting: $*"
  exec "$@"
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying database migrations…"
  npx prisma migrate deploy
  echo "Running idempotent schema guards…"
  sh prisma/scripts/ensure-tenant-smtp-mcp.sh
fi

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding platform templates…"
  node dist/prisma/seed.js || echo "Seed completed or skipped"
fi

echo "Starting API on ${PORT:-3001}…"
exec node dist/src/server/index.js
