# War room

Tactical live view for one product: agent seats, radar, runs, OpenCode history, and **coordinator chat** for commissioning work.

| File | Role |
|------|------|
| `WarRoomContent.tsx` | Full war room (KPIs, agent table, radar, runs, OpenCode panel, Munger veto banner, **CoordinatorChat**) for one `productId` |

## Routes

- `/war-room/:productId` — product-scoped war room (primary)
- `/war-room` — product picker when no id

## Theming

Theme-aware via CSS variables in `src/styles/war-room.css`:

- **Slash (default vars):** cyan tactical dark
- **Stripe HDS Light (`letter`):** pale/indigo — `html[data-theme="letter"] .war-room`
- **Paperclip Warm (`paperclip`):** charcoal/manila — `html[data-theme="paperclip"] .war-room`

## Coordinator

`CoordinatorChat` is embedded with `productId` so all presets, workflows, and agent selection happen conversationally — no manual launcher UI. Live run updates use SSE; `/products/:id/team` refreshes are throttled (~2.5s) to stay under API rate limits. **DELEGATED** and **AWAITING_USER** runs poll every 4–8s and show `OpencodeRunPanel`. Load failures surface a retry banner instead of a blank screen.
