# ADR: Product Desk — Living Node & Agent I/O Contracts

**Status:** Accepted  
**Date:** 2026-07-25

## Context

Virtual Company OS treats each product as a **living node** with its own profile, revenue, integrations, and memory. Departments and agents must read/act on that node—not tenant-wide noise. Agents operate as **input → process → output** pipelines; matching is **by type only** (v1), with human approval (gate B) before downstream consumption.

## Decision

### Product Desk

Per-product operational surface (`ProductDeskItem`):

| Zone (UX) | Status filter | Human action |
|-----------|---------------|--------------|
| Para ti | `draft` | Approve / Return / Archive |
| Listo equipo | `approved` | Dispatch to agent (1 tap) |
| En curso | `in_progress` | Watch in War Room |
| Reciente | `consumed`, `done`, recent | Browse |

### Scope Contract

Every run carries `_scopeContract` in shared memory:

```ts
{ level: "company" | "product" | "department", intent: "discovery" | "operate" | "deliver" | "review", productId?, orgUnitId? }
```

Company workflows (`opportunity-discovery`, etc.) must **not** merge product consensus even when a focus product exists.

### Agent Contract

Agents declare `contractInputs` / `contractOutputs` (JSON string arrays of types). Inbox matcher: `approved output.type ∈ agent.contractInputs`.

### MCP Producers

External MCPs (TheForge first) normalize to desk items via adapters—not bespoke agent logic.

### Reactive First

Dispatch creates runs with `deskInputRefs` (input pack). Proactive schedules deferred until desk loop ≥90% reliable.

## Consequences

- Additive Prisma models; no breaking API changes.
- Artifacts (org-scoped) coexist; desk items are product-scoped operational bus.
- Agent Studio should infer contracts on propose (follow-up).
