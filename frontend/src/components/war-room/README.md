# War room components

| File | Role |
|------|------|
| `WarRoomContent.tsx` | Full war room (KPIs, agent table, radar, runs, OpenCode panel, Munger veto banner, **deliverable health banner**, **CoordinatorChat**) for one `productId` |
| `WarRoomGeneralContent.tsx` | Company-wide war room at `/war-room` — same shell (KPIs, coordinator, tactical table, briefing, product cards) |
| `WarRoomProductToolbar.tsx` | Shared product selector with **Vista general** option and back link |
| `WarRoomAgentSeat.tsx` | Agent seat on the tactical ring (shared by product + general views) |
| `war-room-shared.ts` | Visual helpers (emoji map, circle layout, time formatting) |
| `WarRoomRunSelector.tsx` | Chip tabs to pick which **active run/flow** to watch (up to ~5 simultaneous) |
| `WarRoomRecentRuns.tsx` | Shared recent-runs list (department war room + future unified shell) |
| `ProductHealthPanel.tsx` | Operational health strip: deliverables X/Y, consensus KB, MCP usage, last run diagnosis |
| `ProductMetricsStrip.tsx` | Live revenue (Stripe) and waitlist signup counts with link to settings |
| `DeliverableHealthBanner.tsx` | Warns when last run steps lack on-disk deliverables |

## Routes

- `/war-room` — **general** portfolio war room (all products, all agents)
- `/war-room/:productId` — product-scoped tactical war room
- `?run=<runId>` — watch a specific active flow (updates agent table + briefing)

## Layout

1. **Main row** — coordinator chat + tactical agent table (`war-room-main`, two columns)
2. **Table toolbar** — **run chips** + **full screen** toggle above the tactical ring
3. **Briefing bar** — run status, thinking agent, legend (`war-room-briefing-bar`, full width below)
4. **Radar** — pipeline ideas in a horizontal grid (`war-room-radar-bottom`)
5. **Recent runs** — product-scoped history

## Multi-run watching

When more than one workflow is active for the product (coordinator launch, schedules, etc.):

- API returns `activeRuns[]` plus the selected `activeRun` (from `?run=` or most recent).
- The chip row lists each flow with workflow name, status dot, and start time.
- **Auto** follows the newest active run when several are in progress.

## Full screen

The **Pantalla completa** button expands only the tactical table overlay (fixed viewport, `Escape` to exit). Coordinator chat and briefing stay in normal view when not fullscreen.

Theme-aware via CSS variables in `src/styles/war-room.css`:

- **Default (dark ops):** `.war-room`
- **Stripe HDS Light (`letter`):** pale/indigo — `html[data-theme="letter"] .war-room`
- **Paperclip Warm (`paperclip`):** charcoal/manila — `html[data-theme="paperclip"] .war-room`
