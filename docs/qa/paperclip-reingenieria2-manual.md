# QA — paperclip-reingenieria2 (F–J)

## QA automatizada (producción / contenedor)

La base de datos **no está expuesta** fuera del contenedor API. Usa **Superadmin → QA plataforma** (`/admin/qa`):

1. Inicia sesión como superadmin.
2. (Opcional) Impersona un tenant de prueba.
3. **Ejecutar QA** — valida conexión, migraciones reingeniería 2 y, con tenant, smoke de organigrama, dashboard, inbox, búsqueda y costes.

Los fallos de migración indican ejecutar `prisma migrate deploy` **dentro** del contenedor API.

## QA manual (UI)

Checklist complementario en el tenant impersonado (sin `DATABASE_URL` local):

## F — Objetivos e iniciativas

- [ ] Crear objetivo e iniciativa; lanzar encargo con vínculo desde coordinador.
- [ ] Dashboard: panel **Objetivos estratégicos** y KPIs de entregas/handoff/docs.
- [ ] `/office/objetivos/:id` muestra rollups y filtros de encargos.
- [ ] Detalle encargo y war room muestran `StrategicContextBanner`.

## E — Organigrama

- [ ] `/office/organigram` — tarjetas con bloqueados y handoffs in/out.

## H — Dashboard gestión

- [ ] Periodo 30d vs todo cambia coste y tabla departamental.
- [ ] Enlaces activos/bloqueados abren trabajo o inbox.

## J — Búsqueda global

- [ ] ⌘K (Ctrl+K): buscar encargo, objetivo, iniciativa, departamento (≥2 caracteres).
- [ ] Selección navega a la ruta correcta.

## Migraciones

- [ ] `npx prisma migrate deploy` en el entorno objetivo.
