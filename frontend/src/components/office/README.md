# Office UI

On-demand AI office dashboard at `/office` — the default tenant home.

## Components

| File | Role |
|------|------|
| `OfficeSpendWidget.tsx` | Sidebar monthly spend bar (links to Office) |
| `CoordinatorChat.tsx` | Conversational coordinator with inline team proposal |
| `TeamProposalCard.tsx` | Shared plan card (cost, team, execute) |
| `NotificationBell.tsx` | Header bell + polling toasts + browser notifications |

## Pages

| Route | Page |
|-------|------|
| `/office` | `OfficePage.tsx` — coordinator task input, team proposal, activity feed, ROI tracker, service catalog |

## Design

Styles live in `frontend/src/styles/office-theme.css`, aligned with the War Room aesthetic (glass panels, radial gradients, agent avatars, low cognitive load).

## Flow

1. User chats with the **coordinator** or picks a **Quick service** template.
2. Coordinator replies conversationally and may attach an inline **team proposal** (agents, cost, duration, deliverable).
3. **Approve & run** from the chat or proposal card → workflow launches; user lands on run detail.
4. **Notifications** (bell, toast, optional browser) fire when a run starts or finishes — configurable in Settings → Notifications.

Autonomy is **off by default** (`on_demand` orchestration preset). Enable scheduled or autonomous modes in Settings.
