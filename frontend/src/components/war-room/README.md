# War room components

Unified shell for product, company-wide, and department tactical views.

| File | Role |
|------|------|
| `hooks/useWarRoomTeam.ts` | **Shared live data** — fetch, SSE, debounced refresh, poll fallback, handoff, optional live notes |
| `WarRoomTable.tsx` | **Tactical ring** — core, handoff overlay, seats, optional toolbar + fullscreen |
| `WarRoomBriefingBar.tsx` | Briefing + thinking agent + legend (product war room) |
| `WarRoomCoordinatorAside.tsx` | Collapsible coordinator aside + `WarRoomMainShell` (product + general war rooms) |
| `WarRoomIdleSeats.tsx` | Idle department seats ring (shared with `DepartmentRoomView`) |
| `war-room-coordinator-state.ts` | `useWarRoomCoordinatorCollapsed` + localStorage keys per context |
| `WarRoomVetoBanner.tsx` | Munger veto banner + `resolveWarRoomVetoMessage()` helper |
| `WarRoomContent.tsx` | Product war room (`/war-room/:productId`) — KPIs, coordinator, radar, OpenCode |
| `WarRoomGeneralContent.tsx` | Company war room (`/war-room`) — dashboard agents, encargos briefing |
| `WarRoomRecentRuns.tsx` | Shared recent-runs list (product + department) |
| `WarRoomAgentSeat.tsx` | Agent seat on the tactical ring |
| `WarRoomRunSelector.tsx` | Chip tabs for multi-run watching |
| `WarRoomHandoffOverlay.tsx` | Step handoff animation (SSE `step_start`) |
| `war-room-shared.ts` | Layout helpers, emoji map, time formatting |

Department live view: `frontend/src/components/office/DepartmentWarRoomPanel.tsx` — thin wrapper over `useWarRoomTeam` + `WarRoomTable`; idle state uses `WarRoomIdleSeats`.

## Live refresh strategy

1. **SSE** when run is `RUNNING` or `PENDING` (no interval poll)
2. **Debounced team refresh** on `step_start` / `step_complete` / `done` (min 2.5s)
3. **Fallback poll** when not stream-driven: 8s (`DELEGATED`), 12s (`AWAITING_USER` / default)
4. **`useHeldAgentTeam`** — 2.8s status hold for readable transitions

## URL params

| Context | Param | Example |
|---------|-------|---------|
| Product war room | `?run=` | `/war-room/abc?run=runId` |
| Department war room | `?watchRun=` (alias `?run=`) | `/office/departments/strategy?watchRun=runId` |

## Routes

- `/war-room` — portfolio war room
- `/war-room/:productId` — product tactical war room
- `/office/departments/:slug` — department room + live panel
- `/org-units/:id` — custom department room + live panel

## Performance notes

- SSE effect deps **exclude** `team` — avoids reconnecting EventSource on every poll
- Scope change resets data; `watchRun` changes refresh silently (no full-page loading flash)
- Product team payload remains heavy — future: scoped `/team/light` endpoint for poll ticks
