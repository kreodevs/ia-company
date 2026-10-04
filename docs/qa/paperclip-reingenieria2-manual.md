# QA manual — paperclip-reingenieria2 (F–J)

Checklist con tenant de prueba y `DATABASE_URL` configurado.

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
