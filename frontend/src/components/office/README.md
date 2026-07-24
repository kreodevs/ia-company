# Office UI

On-demand AI office at `/office` — human-facing layer over the agent company.

## Human office (`/office`, `/office/encargos`)

| Route | Page | Purpose |
|-------|------|---------|
| `/office` | `OfficePage.tsx` | Coordinator chat, services, activity, ROI |
| `/office/encargos` | `OfficeEncargosPage.tsx` | Job inbox — commissioned work |
| `/office/encargos/:runId` | `OfficeEncargoDetailPage.tsx` | Consolidated **summary** + per-agent documents |

## Components

| File | Role |
|------|------|
| `CoordinatorChat.tsx` | Conversational coordinator with inline team proposal |
| `TeamProposalCard.tsx` | Shared plan card (cost, team, execute) |
| `NotificationBell.tsx` | Header bell; panel via portal (fixed, safe-area) on mobile |
| `OfficeSpendWidget.tsx` | Sidebar monthly spend bar |

## Debug office (`/debug/*`)

Technical routes for logs, consensus, ops, and AI catalog — linked from encargo detail via **Depuración**.

## Design

- `frontend/src/styles/office-theme.css` — War Room aesthetic
- `frontend/src/styles/office-encargos.css` — job inbox + markdown preview; Stripe HDS active pills use indigo text (`--office-filter-active-text`), not white on tint
- `RichMarkdownView` — GFM + Mermaid + `chart` JSON blocks (Recharts)

## Flow

1. User chats with the **coordinator** or picks a **Quick service**.
2. Coordinator proposes team inline → **Approve & run**.
3. User lands on **`/war-room/:productId?run=:runId`** to watch agents live (encargo at **`/office/encargos/:runId`** when finished).
4. When finished: **Resumen** (mandatory LLM synthesis) + per-agent documents in **Documentos** tab. Duplicates (revision vs step) are deduplicated in the list.
5. **Scope** selector above chat: general exploration vs. a specific product — plan card shows scope before execute.
6. **Notifications** link to the human encargo view.
7. **War room** stays available for live tactical view.

Autonomy is **off by default** (`on_demand`). Enable scheduled/autonomous modes in Settings.
