---
name: tenant-mcp-tools
description: Use tenant-registered MCP tools safely with read-only defaults and per-run call limits.
---

# Tenant MCP tools

When MCP tools appear as `mcp_<server>__<tool>` in your tool list, they come from servers registered by the tenant admin.

## Defaults

- **Read-only mode** (default): mutating tool names (`create_*`, `delete_*`, `send_*`, etc.) are blocked at registration time.
- **Per-run budget**: each server has `maxCallsPerRun` (default 30). Stop before hitting the limit.
- **Agent grants**: only agents explicitly granted access see a server's tools.

## Usage rules

1. Prefer read/query tools unless the task clearly requires a write and read-only is disabled for that server.
2. Pass minimal arguments; never exfiltrate unrelated workspace data.
3. On timeout or connection failure, report clearly and do not retry in a tight loop.
4. Do not spawn shell commands to bypass MCP guardrails.

## When to use

- Fetch live data from a tenant-approved MCP (CRM, docs, internal APIs).
- Enrich deliverables with external context the workspace files lack.

## When not to use

- SMTP email → use `send_email` instead.
- GitHub/git operations → use built-in git tools.
- Anything not granted to your agent role.
