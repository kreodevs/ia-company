# Prisma scripts

## `ensure-tenant-smtp-mcp.sql` / `.sh`

Idempotent guard for tenant SMTP columns and MCP registry tables. Uses `IF NOT EXISTS` for columns, indexes, and tables; `DO` blocks for enum types and foreign keys.

**When it runs**

- Automatically after `prisma migrate deploy` in Docker (`docker/api/entrypoint.sh`) when `RUN_MIGRATIONS` is true (default).
- Manually: `npm run db:deploy`

Safe to re-run on every deploy — no-op when schema is already up to date.
