# Settings components

| Component | Purpose |
|-----------|---------|
| `OrchestrationPlanPanel.tsx` | Tenant operations plan: presets (`on_demand`, `discovery_only`, `light_exploration`), fixed rules, cron/interval timing, conditions, **tenant timezone** (cron evaluated locally), **next/last run**, and skip diagnostics. Default is on-demand (no rules). Dynamic orchestrator mode remains available as an advanced option. |
| `TenantSmtpSection.tsx` | Tenant SMTP for agent outbound email: host, credentials, allowlist, daily quota, test connection. Used in Settings → Integrations. |
| `TenantMcpSettingsPanel.tsx` | MCP server registry: stdio commands, env secrets, tool sync, agent grants, read-only guardrails, **Validate with LLM** smoke test. Used in Settings → MCP servers. |
| `TenantDeliveryBrandingPanel.tsx` | Client delivery branding: logo URL, primary color, footer, confidentiality notice, contact email. Used in Settings → Entrega cliente (`?tab=delivery`). |

Used by `SettingsPage` (Schedules, Integrations, MCP, and Delivery tabs).

## Guardrails (backend)

- **SMTP:** allowlist-only recipients, disposable domain block, 5 recipients/email, configurable daily cap, audit log per send.
- **MCP:** read-only filters mutating tool names, per-run call budget, agent grants required, 15s connect / 30s call timeouts. Tool JSON Schemas are sanitized on sync and passed to the LLM via native `jsonSchema()` (no lossy Zod conversion). Settings → **Validate with LLM** probes compatibility with the platform model.
