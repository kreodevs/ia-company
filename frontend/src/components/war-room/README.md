# War room UI

Tactical live view of agents assigned to a product.

## Components

| File | Role |
|------|------|
| `WarRoomContent.tsx` | Full war room (KPIs, agent table, radar, runs) for one `productId` |
| `WarRoomPage.tsx` (pages) | Sidebar route with product `<Select>` |

## Routes

- `/war-room` → redirects to focused or first product
- `/war-room/:productId` → war room for that product
- `/products/:id/team` → legacy redirect to `/war-room/:id`

## API

`GET /products/:id/team` — agent statuses, active run, recent runs, pipeline radar.
