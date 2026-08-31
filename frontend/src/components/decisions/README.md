# Decision components

## `DecisionExecutiveSummary`

Shows the **consolidated job summary** (`encargoSummary` from the linked run's shared memory) so humans can approve or reject without opening each agent report first. Falls back to per-agent excerpts when no synthesized summary exists. Displays the team GO/NO-GO recommendation prominently; hides the auto-generated weak rationale (`Recommended GO: {title}`).

**Props:** `recommended`, `rationale`, `encargoSummary`, `encargoSummaryKind`, `evidence`, `ideaTitle`.

**Used in:** `PendingDecisionsPage`, `DecisionsPage`.

**API:** enriched fields on `GET /decisions` and `GET /decisions/:id` via `listDecisionProposalsEnriched`.

## `DecisionEvidencePanel`

Renders clickable agent chips (name + role) for Go/No-Go proposals. Each chip opens a modal with the **full markdown document** from the linked workflow run. When the evidence summary cites a `docs/…` path, that file is shown instead of a longer handoff or Company Memory stub. The modal uses **85% viewport width**, **50px top/bottom margin**, and scrolls the document body inside a fixed header.

**Props**

| Prop | Description |
|------|-------------|
| `proposalId` | Decision proposal id (used to fetch documents) |
| `runId` | Optional run id; when missing, chips show truncated summary only |
| `evidence` | `DecisionProposalEvidence[]` from the proposal |
| `documents` | Optional preloaded run documents (skips API fetch) |

**Used in:** `PendingDecisionsPage`, `DecisionsPage`, `OfficeEncargoDetailPage`.

**API:** `GET /decisions/:id/documents` → `{ documents: OfficeEncargoDocument[] }`
