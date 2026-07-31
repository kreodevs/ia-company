# Decision components

## `DecisionEvidencePanel`

Renders clickable agent chips (name + role) for Go/No-Go proposals. Each chip opens a modal with the **full markdown document** from the linked workflow run.

**Props**

| Prop | Description |
|------|-------------|
| `proposalId` | Decision proposal id (used to fetch documents) |
| `runId` | Optional run id; when missing, chips show truncated summary only |
| `evidence` | `DecisionProposalEvidence[]` from the proposal |
| `documents` | Optional preloaded run documents (skips API fetch) |

**Used in:** `DecisionsPage`, `OfficeEncargoDetailPage`.

**API:** `GET /decisions/:id/documents` → `{ documents: OfficeEncargoDocument[] }`
