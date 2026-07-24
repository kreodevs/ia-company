# ADR: Tenant SMTP and MCP integrations

## Status

Accepted — 2025-07-23

## Context

Tenants need agents to deliver work to humans via email and to call approved external systems without giving agents raw shell access to arbitrary APIs.

## Decision

### Tenant SMTP

- Per-tenant SMTP config on `TenantIntegrationConfig` (encrypted password).
- Agents use `send_email` tool → `sendTenantAgentEmail()` with guardrails:
  - Recipients must be active tenant users and/or configured allowlist.
  - Max 5 recipients, configurable daily quota (default 20).
  - Block disposable domains; audit every send in `TenantEmailSendLog`.
- Platform Resend (`src/lib/email.ts`) remains for system notifications only.

### Tenant MCP registry

- `TenantMcpServer` + `TenantMcpTool` + `AgentMcpGrant` models.
- Stdio transport only for MVP; tools synced via MCP SDK `listTools`.
- Runtime: `createAgentToolsWithIntegrations()` merges MCP tools for granted agents.
- Guardrails:
  - `readOnly` (default true) skips mutating tool name patterns.
  - `maxCallsPerRun` per server (default 30).
  - Connect timeout 15s, call timeout 30s.
  - Env vars stored encrypted in `envJson`.

### Skills

- `tenant-email-outbound` — operations, sales, marketing, coordinator agents.
- `tenant-mcp-tools` — coordinator agent.

## Consequences

- Admins configure SMTP/MCP in Settings; no code deploy needed for new MCP servers.
- Mutating MCP tools require explicit opt-out of read-only mode.
- SSE MCP transport deferred until stdio path is stable in production.
- Migration `20250723230000_tenant_smtp_mcp` is idempotent; Docker entrypoint runs `migrate deploy` + `ensure-tenant-smtp-mcp.sql` on every api start when `RUN_MIGRATIONS` is true (default).
