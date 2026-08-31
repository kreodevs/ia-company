# Product deliveries UI

Unified **outcome** surface per product at `/products/:productId/entregas`.

| Component | Role |
|-----------|------|
| `ProductDeliveryEncargoCard` | Summary row for one encargo; expand to load full report |
| `EncargoResultPanel` | Lazy-loaded final report + documents + client delivery panel |
| `README.md` | This file |

Page: `frontend/src/pages/ProductDeliveriesPage.tsx`  
API: `GET /products/:id/deliveries-overview` + `GET /office/encargos?productId=`

Sections:

1. **Requires your attention** — GO/NO-GO, failed runs, OpenCode gates, desk “for you”
2. **In progress** — live encargos with war room link (no summary until delivered)
3. **Delivered** — report preview on each card, first item expanded by default

Each delivered card shows:
- **Resumen** preview (synthesized `runSummary` or lead-agent fallback)
- Badge: synthesized vs agent fallback vs pending
- Expand → **Resumen del encargo** tab + **Documentos por agente** tab

War room remains for **live** monitoring only; final results live here.
