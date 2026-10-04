# UI estratégica (Oficina)

## Rutas

- `/office/objetivos` — CRUD y tabla Kreo `DataTable` con enlace al detalle.
- `/office/objetivos/:goalId` — KPIs, iniciativas, encargos recientes, enlace a `/office/trabajo?companyGoalId=…`.
- `/office/iniciativas` — iniciativas por objetivo.
- `/office/dashboard` — métricas de gestión y tabla departamental (Fase H).

## Creación de encargo

En `CoordinatorChat`, `StrategicContextFields` pregunta objetivo/iniciativa antes de ejecutar el plan.

## Detalle de encargo

Pestaña Resumen muestra objetivo e iniciativa con enlaces a las vistas estratégicas.
