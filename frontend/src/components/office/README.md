# Office UI

On-demand AI office dashboard at `/office` — the default tenant home.

## Components

| File | Role |
|------|------|
| `OfficeSpendWidget.tsx` | Sidebar monthly spend bar (links to Office) |

## Pages

| Route | Page |
|-------|------|
| `/office` | `OfficePage.tsx` — coordinator task input, team proposal, activity feed, ROI tracker, service catalog |

## Design

Styles live in `frontend/src/styles/office-theme.css`, aligned with the War Room aesthetic (glass panels, radial gradients, agent avatars, low cognitive load).

## Flow

1. User describes a task or picks a **Quick service** template.
2. **Plan team** → coordinator proposes agents, cost range, duration, deliverable.
3. **Approve & run** → workflow launches; user lands on run detail.

Autonomy is **off by default** (`on_demand` orchestration preset). Enable scheduled or autonomous modes in Settings.
