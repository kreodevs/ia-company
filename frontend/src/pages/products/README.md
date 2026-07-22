# Products page

[`ProductsPage.tsx`](../pages/ProductsPage.tsx) — portfolio de oportunidades y productos activos.

## Ruta

- `/products` — pestañas **Oportunidades** y **Productos activos**
- `/products?tab=active` — abre directamente productos activos

## API

`GET /products/overview` — productos, pipeline filtrado, foco y último discovery.

## Acciones

| Contexto | Acción |
|----------|--------|
| Oportunidad | Evaluar con agentes, NO-GO |
| Producto activo | Enfocar, pausar, archivar, NO-GO (`ProductActionsMenu`) |
| Reportes | **War room** (`/war-room/:id`), memoria, código, última ejecución |

Operaciones del ciclo meta (KPIs, stepper) permanecen en `/ops`.
