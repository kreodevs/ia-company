# Guide — Products

Register products, link departments, and use per-product memory.

---

## Table of contents

1. [Lifecycle](#lifecycle)
2. [Link a department](#link-a-department)
3. [Product memory and consensus](#product-memory-and-consensus)
4. [Desk and war room](#desk-and-war-room)
5. [Launch work on a product](#launch-work-on-a-product)
6. [Frequently asked questions](#frequently-asked-questions)

---

## Lifecycle

```mermaid
stateDiagram-v2
  [*] --> queued: Register
  queued --> evaluating: Evaluate idea
  evaluating --> building: Human GO / bootstrap
  building --> launching: Market-ready
  launching --> growing: Traction / revenue
  growing --> paused: Pause
  paused --> growing: Resume
  growing --> archived: Archive
  building --> archived: Cancel (NO-GO)
```

Each product has a workspace under `projects/{slug}/` with its own `consensus.md` (synced from the UI) and `docs/` folders.

From **Products** you can register an existing folder, bootstrap a new workspace, import detected folders, set focus, pause, or archive.

---

## Link a department

1. Open **Products** → the product → **Settings** (`/products/:id/settings`).
2. **General** tab → **Department** → pick the Org Unit (e.g. marketing agency).
3. Optional: adjust **Work item kind** (`product`, `client`, `campaign`, `project`).
4. Save.

Effects:

- Department-scoped runs use that Org Unit’s agents and `design.md`.
- Completed handoffs create **gallery artifacts** when product + dept. are linked.
- From the department page you can **launch work** with a linked product.

---

## Product memory and consensus

Each product keeps **its own memory**: positioning, pricing, feature decisions, learnings.

| View | Route | Contents |
|------|-------|----------|
| Product consensus | `/debug/products/:productId/consensus` (also linked from Product settings) | Live document + **Revisions** tab (one handoff per agent step) |
| Tenant-wide consensus | `/debug/consensus` (Debug office → Consensus) | Company strategy, idea pipeline, cycle next action |

The **Revisions** tab lists `consensusUpdate`, decisions, open questions, and vetoes per step. The main document accumulates cycles with timestamps.

After an important job, ask the Coordinator to summarize decisions or edit memory yourself.

> Handoff details: **Handoffs and flow** article.

---

## Desk and war room

| View | Route | Use |
|------|-------|-----|
| **Desk** | `/products/:id/desk` | Kanban, roadmap, signals, playbooks |
| **War room** | `/war-room/:id` | Live progress, deliverable health, chat |
| **Code** | `/products/:id/code` | Workspace explorer |
| **Team** | `/products/:id/team` | Agents active on the product |

---

## Launch work on a product

- **War room** or **department room** → product scope selector + Coordinator.
- **Office** → Coordinator infers product from the brief or asks; quick services can start from focused product context.
- **Department** → “Launch work” + linked product (`/org-units/:id`).
- **Workflows** → run from the editor with tenant consensus or a seed naming the slug.

The worker loads product consensus into shared memory before the first agent when the job is linked to that product.

---

## Frequently asked questions

### What is the difference between `evaluating` and `building`?

- **`evaluating`** — idea in the pipeline; usually needs `new-product-evaluation` and a human GO/NO-GO decision.
- **`building`** — GO approved; code and docs live under `projects/{slug}/`.

### Can I have multiple products in build at once?

Yes, up to the platform limit (**2** products in `building`/`launching` per tenant — see `MAX_BUILDING_PRODUCTS` in code).

### Where do I approve a pipeline idea?

**Decisions** (`/decisions`) or the job detail under **My jobs**. See [/help/guia-flujos](/help/guia-flujos#go--no-go-decisions).
