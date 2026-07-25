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

1. `POST /org-studio/propose` — template + optional description → proposal (agents, schema, tokens, design.md draft). With tenant LLM: refines summary, brand voice, niche, and appends design.md.
2. `POST /org-studio/apply` — Munger gate (LLM inversion / VETO on fatal flaws), creates `OrgUnit`, seeds agents, optional linked work item (`createWorkItem`, `workItemKind`), syncs workspace.

### Phase 4 (feat/org-os)

- **LLM propose:** `enhanceOrgProposalWithLlm` when mission ≥ 12 chars.
- **Munger gate:** `reviewOrgProposalWithMunger` on apply; throws `VETO: …` on fatal flaws.
- **Auto work item:** `createLinkedWorkItem` bootstraps product/client slot linked to department.
- **workItemKind routing:** `org-work-item.ts` maps presets/workflows for meta-orchestrator and org launcher.
- **War room:** `OrgArtifactsPanel` shows recent department artifacts in-place.
- **SchemaDynamicForm:** Kreo `DynamicForm` via adapter (`schema-to-kreo.ts`).
- **ArtifactGallery:** Kreo `DataTable` (PrimeReact headless + Kreo tokens).

### Phase 5 (feat/org-os)

- **War room:** coordinator passes `orgUnitId` when product is linked to a department.
- **Org Studio:** `workItemKind` selector, Munger pre-mortem on propose (blocks apply on VETO).
- **Multi work item:** `POST /org-units/:id/work-items` + UI on department detail.
- **Templates:** product-studio agents, `custom-department` template, `brandPrimaryColor` in schema.
- **Orchestration:** schedule `conditions.orgUnitId` scopes fixed/meta runs to a department.

## Consequences

- **Reversible:** feature lives on branch `feat/org-os`; existing tenants ignore `OrgUnit` until created.
- **Migration:** additive columns on `TenantProduct`; new tables only.
- **Kreo DEV pull:** `frontend/src/components/{atoms,molecules,organisms}/` + `kreo-vars.css`; deps via `get_dependencies_for_components`.
