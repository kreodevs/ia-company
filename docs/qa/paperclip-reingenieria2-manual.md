# QA — paperclip-reingenieria2 (F–J)

## Runbook producción (recomendado)

La base de datos vive **solo dentro del contenedor API**. No uses `DATABASE_URL` en tu máquina para validar prod.

### 1. Automatizado — UI superadmin

1. Inicia sesión como **superadmin**.
2. Ve a **Plataforma → QA plataforma** (`/admin/qa`).
3. En el desplegable, **impersona el tenant** de prueba (staging o prod controlado).
4. Pulsa **Ejecutar QA**.
5. Revisa la tabla de checks: **0 fail** antes de dar por bueno el despliegue.
6. En el panel **Checklist manual**, marca cada paso tras probarlo en UI. Los badges **auto** indican qué ya validó el servidor (pass/warn/fail).

Si falla `migrations_paperclip`:

```bash
# Dentro del contenedor API (o job de deploy)
npm run db:deploy
```

### 2. Automatizado — CLI en contenedor

Útil en CI o SSH al pod:

```bash
# Solo plataforma (migraciones + ping)
npm run qa:platform

# Con tenant
QA_TENANT_ID=<cuid-del-tenant> npm run qa:platform
```

Exit code `1` si hay checks en **fail**.

### 3. Checklist manual (UI tenant)

Con el **mismo tenant impersonado**, recorre los pasos del panel en `/admin/qa` o esta lista. Orden sugerido:

| Fase | Ruta | Qué validar |
|------|------|-------------|
| F | `/office/objetivos` | Crear objetivo + iniciativa |
| F | Coordinador `/office` | Encargo con vínculo estratégico |
| F/H | `/office/dashboard` | Panel objetivos, KPIs, periodo 30d vs todo |
| F | `/office/objetivos/:id` | Rollups y encargos |
| F | `/office/encargos/:id` | `StrategicContextBanner` |
| E | `/office/organigrama` | Tarjetas, bloqueados, handoffs, grafo |
| H | `/office/inbox` | Enlaces desde KPIs bloqueados |
| I | `/office/departments/engineering` | Operaciones recurrentes |
| J | `/office/dashboard` | Panel costes, filtros, alertas |
| J | `/office` | ⌘K / Ctrl+K: búsqueda y «bloqueados ingeniería» |
| Corte 2 | `/office/inbox` | Handoff + revisión documento (si hay datos) |

### 4. Flujo profundo Corte 2 (cuando haya tiempo)

1. Encargo con **Estrategia → Producto → Ingeniería** (mapa de trabajo).
2. Enviar y **aceptar handoff** desde inbox.
3. **Revisión de documento** en pestaña Archivos del encargo.
4. Volver a **Ejecutar QA**: `corte2_data_smoke` debería pasar de warn → pass.

---

## Referencia por fase

### F — Objetivos e iniciativas

- Objetivo, iniciativa y encargo vinculado.
- Dashboard y detalle de objetivo con rollups.
- Banner estratégico en encargo / war room.

### E — Organigrama

- `/office/organigrama` — jerarquía, virtuales, colaboración.

### H — Dashboard

- Periodo y drill-down a inbox/trabajo.

### J — Coste y búsqueda

- Costes, proyección, ⌘K.

### Migraciones

Cubierto por check `migrations_paperclip` en QA automatizada (`db:deploy` en contenedor).
