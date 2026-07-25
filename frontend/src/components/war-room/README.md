# War room

Tactical live view for one product: agent seats, radar, runs, OpenCode history, and **coordinator chat** for commissioning work.

| File | Role |
|------|------|
| `WarRoomContent.tsx` | Full war room (KPIs, agent table, radar, runs, OpenCode panel, Munger veto banner, **deliverable health banner**, **CoordinatorChat**) for one `productId` |
| `DeliverableHealthBanner.tsx` | Warns when last run has missing docs / weak handoff; links to consensus trace and agent docs |

## Routes

- `/war-room/:productId` — product-scoped war room (primary)
- `/war-room` — product picker when no id

## Layout (top → bottom)

1. **Main row** — coordinator chat + tactical agent table (`war-room-main`, two columns)
2. **Briefing bar** — run status, thinking agent, legend (`war-room-briefing-bar`, full width below)
3. **Radar** — pipeline ideas in a horizontal grid (`war-room-radar-bottom`)
4. OpenCode history + recent runs

## Theming

Theme-aware via CSS variables in `src/styles/war-room.css`:

- **Slash (default vars):** cyan tactical dark
- **Stripe HDS Light (`letter`):** pale/indigo — `html[data-theme="letter"] .war-room`
- **Paperclip Warm (`paperclip`):** charcoal/manila — `html[data-theme="paperclip"] .war-room`

## Coordinator

`CoordinatorChat` is embedded with `productId` so all presets, workflows, and agent selection happen conversationally — no manual launcher UI. Live run updates use SSE; `/products/:id/team` refreshes are throttled (~2.5s) to stay under API rate limits. Agent **thinking/queued** states stay visible for ~2.8s after a step completes so the table is readable during fast runs. The tactical table uses a padded inner stage plus compact avatars when the team is large (14+ agents) so seat labels are not clipped. **DELEGATED** and **AWAITING_USER** runs poll every 4–8s and show `OpencodeRunPanel`. Load failures surface a retry banner instead of a blank screen.
