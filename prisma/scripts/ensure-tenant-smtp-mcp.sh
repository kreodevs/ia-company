#!/usr/bin/env sh
# Idempotent schema guard for tenant SMTP + MCP (runs after prisma migrate deploy).
# Safe when objects already exist (db push, partial deploy, manual SQL).

set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ensure-tenant-smtp-mcp: DATABASE_URL not set, skipping"
  exit 0
fi

echo "Ensuring tenant SMTP + MCP schema (idempotent)…"
npx prisma db execute --file prisma/scripts/ensure-tenant-smtp-mcp.sql --schema prisma/schema.prisma
echo "Tenant SMTP + MCP schema OK"
