# Products page

[`ProductsPage.tsx`](../pages/ProductsPage.tsx) — portfolio de oportunidades y productos activos.

## Ruta

- `/products` — pestañas **Oportunidades** y **Productos activos**
- `/products?tab=active` — abre directamente productos activos
- `/products/:id/settings` — configuración del producto (datos, GitHub, intake, **revenue/Stripe**, OpenCode)

## API

`GET /products/overview` — productos, pipeline filtrado, foco y último discovery.

## Acciones

| Contexto | Acción |
|----------|--------|
| Oportunidad | Evaluar con agentes, NO-GO |
| Producto activo | Enfocar, pausar, archivar, NO-GO (`ProductActionsMenu`) |
| Reportes / entregables | **War room** (`/war-room/:id`), **Encargos** (`/office/encargos/:runId`), código |
| Configuración | **Settings** (`/products/:id/settings`) — nombre, GitHub, re-intake, revenue/Stripe, OpenCode |

Operaciones del ciclo meta (KPIs, stepper) permanecen en `/ops`.
