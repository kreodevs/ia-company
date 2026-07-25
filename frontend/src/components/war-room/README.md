# War room components

| File | Role |
|------|------|
| `WarRoomContent.tsx` | Full war room (KPIs, agent table, radar, runs, OpenCode panel, Munger veto banner, **deliverable health banner**, **CoordinatorChat**) for one `productId` |
| `WarRoomRunSelector.tsx` | Dropdown to pick which **active run/flow** to watch when several are in progress |
| `DeliverableHealthBanner.tsx` | Warns when last run steps lack on-disk deliverables |

## Routes

- `/war-room/:productId` — product-scoped war room (primary)
- `/war-room` — product picker when no id
- `?run=<runId>` — watch a specific active flow (updates agent table + briefing)

## Layout

1. **Main row** — coordinator chat + tactical agent table (`war-room-main`, two columns)
2. **Table toolbar** — **run selector** + **full screen** toggle above the tactical ring
3. **Briefing bar** — run status, thinking agent, legend (`war-room-briefing-bar`, full width below)
4. **Radar** — pipeline ideas in a horizontal grid (`war-room-radar-bottom`)
5. **Recent runs** — product-scoped history

## Multi-run watching

When more than one workflow is active for the product (coordinator launch, schedules, etc.):

- API returns `activeRuns[]` plus the selected `activeRun` (from `?run=` or most recent).
- The selector lists each flow with workflow name, status, and start time.
- **Auto (most recent)** clears `?run=` and follows the newest active run.

## Full screen

The **Pantalla completa** button expands only the tactical table overlay (fixed viewport, `Escape` to exit). Coordinator chat and briefing stay in normal view when not fullscreen.

Theme-aware via CSS variables in `src/styles/war-room.css`:

- **Default (dark ops):** `.war-room`
- **Stripe HDS Light (`letter`):** pale/indigo — `html[data-theme="letter"] .war-room`
- **Paperclip Warm (`paperclip`):** charcoal/manila — `html[data-theme="paperclip"] .war-room`
