# ADR: Org OS — Departments & Virtual Companies

**Status:** Accepted (feat/org-os)  
**Date:** 2026-07-24

## Context

Virtual Company OS today models a **SaaS product studio** (tenant → products → 14 startup agents). Users want **multiple departments or virtual companies** (e.g. digital marketing agency with copy manager, community manager, designer) without forking the platform.

## Decision

Introduce an **additive Org layer** — no breaking changes to existing `TenantProduct` flows.

| Concept | Model | Notes |
|---------|--------|-------|
| Business template | `BusinessTemplate` | Platform seed (marketing-agency, product-studio) |
| Department / virtual co | `OrgUnit` | Per tenant; JSONB `config`, `configSchema`, `tokens`, `designMd` |
| Work item | `TenantProduct` + `workItemKind` | `product \| client \| campaign \| project`; optional `orgUnitId` |
| Deliverable | `Artifact` | Typed JSONB body + gallery UI |

### JSONB + DynamicForm contract

- `configSchema` follows Kreo **DynamicForm** field shapes (`text`, `select`, `multiselect`, `switch`, …).
- Frontend uses `SchemaDynamicForm` (Kreo-compatible); swap to pulled `DynamicForm` organism when MCP bootstrap completes.
- `tokens` stores semantic design tokens (DTCG-style JSON) synced to workspace.
- `designMd` is source for agent brand/voice rules; synced to `projects/_org/{slug}/design.md`.

### Workspace layout

```
projects/_org/{org-slug}/
  design.md
  tokens.json
  docs/{role}/
```

Products/clients remain under `projects/{slug}/` with optional `orgUnitId` link.

### Org Studio (AI-assisted)

1. `POST /org-studio/propose` — template + optional description → proposal (agents, schema, tokens, design.md draft).
2. `POST /org-studio/apply` — creates `OrgUnit`, seeds agents, syncs workspace.

Munger gate and full LLM customization are phase 2; v1 uses template catalog + description merge.

## Consequences

- **Reversible:** feature lives on branch `feat/org-os`; existing tenants ignore `OrgUnit` until created.
- **Migration:** additive columns on `TenantProduct`; new tables only.
- **Next:** pull Kreo `DynamicForm` + `DataTable` for artifact gallery; wire meta-orchestrator to `orgUnitId`.
