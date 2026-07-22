# War room UI

Tactical live view of agents assigned to a product.

## Components

| File | Role |
|------|------|
| `WarRoomContent.tsx` | Full war room (KPIs, agent table, radar, runs, OpenCode history) for one `productId` |
| `WarRoomPage.tsx` (pages) | Sidebar route with product `<Select>` |

## Routes

- `/war-room` → redirects to focused or first product
- `/war-room/:productId` → war room for that product
- `/products/:id/team` → legacy redirect to `/war-room/:id`

## API

`GET /products/:id/team` — agent statuses, active run (incl. `DELEGATED`), OpenCode metadata, recent runs, pipeline radar.

`GET /products/:id/opencode/history` — delegation history for the product.
