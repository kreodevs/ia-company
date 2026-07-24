# War room UI

Tactical live view of agents assigned to a product.

## Components

| File | Role |
|------|------|
| `WarRoomContent.tsx` | Full war room (KPIs, agent table, radar, runs, OpenCode history, **ProductWorkLauncher**) for one `productId` |
| `WarRoomPage.tsx` (pages) | Sidebar route with product `<Select>` |

## Routes

- `/war-room` → redirects to focused or first product
- `/war-room/:productId` → war room for that product
- `/products/:id/team` → legacy redirect to `/war-room/:id`

## API

`GET /products/:id/team` — agent statuses, active run (incl. `DELEGATED`), OpenCode metadata, recent runs, pipeline radar.

`GET /products/:id/opencode/history` — delegation history for the product.

`GET /products/:id/launch-options` — presets, workflows, and agents available for this product.

`POST /products/:id/launch` — execute workflow or single-agent task with `productId`/`productSlug` context.

## Theming

Styles live in `frontend/src/styles/war-room.css` with `--war-room-*` tokens on `.war-room`.

- **Slash (dark):** tactical navy gradient (default tokens)
- **Paperclip Warm (`letter`):** charcoal/manila warm dark — `html[data-theme="letter"] .war-room` overrides

`ProductWorkLauncher` receives `className="war-room-launcher"` for embedded contrast inside the war room shell.
