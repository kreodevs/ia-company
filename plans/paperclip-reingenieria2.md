# Paperclip Reingeniería 2 — Empresa departamental y trabajo interdepartamental

> Documento de ejecución posterior a `plans/paperclip-reingenieria.md`.
>
> Objetivo: evolucionar la Oficina desde un sistema de ejecución de agentes hacia un sistema operativo de empresa, donde objetivos, departamentos, trabajos, handoffs, revisiones y entregas formen un flujo persistente y visible.
>
> Referencia comparativa: [Paperclip AI](https://github.com/paperclipai/paperclip). Paperclip enfatiza cuatro pilares: tareas, organigrama, entrenamiento de agentes e infraestructura. Esta reingeniería conserva la metáfora diferencial de Oficina/Departamentos/War Room y añade las primitivas de coordinación empresarial que faltan.

---

## 1. Diagnóstico actual

### Ya implementado

- Oficina visual con recepción y floor plan.
- Departamentos virtuales y `OrgUnit`.
- Encargos y `ExecutionRun`.
- Sesiones multiagente.
- War room en vivo.
- Tools HITL, checkpoints y aprobaciones.
- Workspace snapshots y commits verificados.
- Archivo con autoría de archivos.
- Entregas públicas.
- Presupuestos y coste de sesiones.
- Procedimientos/workflows.

### Gap principal

La unidad central todavía es principalmente:

```text
Encargo → ExecutionRun → AgentSession → documentos
```

La empresa debe evolucionar hacia:

```text
Objetivo de empresa
  └── Proyecto / iniciativa
        └── Encargo padre
              ├── Trabajo de Estrategia
              ├── Trabajo de Producto
              ├── Trabajo de Ingeniería
              └── Revisión / aprobación / entrega
```

La prioridad no es añadir más animación a la oficina, sino hacer persistente y visible la coordinación del trabajo.

---

## 2. Principios de producto

1. **El encargo es el centro de trabajo**, no solo una ejecución técnica.
2. **Cada departamento tiene ownership explícito**, responsabilidades y métricas.
3. **Los handoffs son objetos de primera clase**, no solo texto dentro de `sharedMemory`.
4. **El usuario gestiona excepciones**, no tiene que vigilar cada sesión.
5. **Los estados empresariales están separados de los estados técnicos.**
6. **Toda entrega debe conservar contexto, autoría, revisión y snapshot.**
7. **No sustituir la metáfora de Oficina por un gestor de tickets genérico.**
8. **Implementar por cortes verticales pequeños y demostrables.**

---

# Fase A — Encargo como centro de trabajo ✅ (2026-10-03 — completada en Corte 2: riel de estado, bloqueadores, participantes y timeline unificado)

## Objetivo

Convertir `OfficeEncargoDetailPage` en la ficha operativa completa de un trabajo.

## UX objetivo

Navegación principal de un encargo:

```text
Resumen | Trabajo | Conversación | Archivos | Actividad | Coste | Entrega
```

La primera pantalla debe responder en menos de 10 segundos:

- Qué se pidió.
- Qué objetivo persigue.
- Quién es responsable.
- Qué departamentos participan.
- Qué está bloqueado.
- Qué falta.
- Qué decisión necesita el usuario.
- Cuánto se ha gastado.

## Backend/data

Evaluar y, si aplica, añadir modelos:

- `OfficeWorkItem` o extensión de `ExecutionRun` para el trabajo empresarial.
- `ownerDepartmentId` / `ownerDepartmentSlug`.
- `ownerAgentId`.
- `businessStatus` separado de `ExecutionRun.status`.
- `nextAction`.
- `blockedReason`.
- `dueAt` opcional.
- `priority`.
- `parentWorkItemId`.
- `projectId` / `initiativeId` opcional.

No crear duplicación innecesaria: reutilizar `ExecutionRun` si puede soportar correctamente la semántica de trabajo.

## UI

Modificar:

- `frontend/src/pages/OfficeEncargoDetailPage.tsx`.
- Componentes nuevos en `frontend/src/components/office/`:
  - `EncargoWorkHeader`.
  - `EncargoStatusRail`.
  - `EncargoActivityTimeline`.
  - `EncargoBlockersPanel`.
  - `EncargoParticipantsPanel`.

Añadir una columna lateral con:

- Estado empresarial.
- Departamento owner.
- Responsable.
- Próximo paso.
- Bloqueadores.
- Presupuesto consumido.
- Departamentos participantes.

## Estados empresariales

```text
Borrador
Planificando
En ejecución
Esperando información
Esperando aprobación
Bloqueado
En revisión
Listo para entregar
Entregado
Cancelado
```

Separar visualmente:

- Estado del trabajo.
- Estado técnico de sesiones.
- Estado de gobernanza.
- Estado financiero.

## Validación

- Un encargo con sesiones completadas pero pendiente de revisión conserva estado `En revisión`.
- Un encargo puede tener sesiones activas y estado empresarial `Bloqueado`.
- Timeline muestra eventos técnicos y empresariales en orden.
- El detalle no obliga a ir a `/debug`.

---

# Fase B — Trabajos por departamento y mapa interdepartamental ✅ (2026-10-03, `DepartmentWorkMapPanel` con tarjetas por dept + dependencias)

## Objetivo

Representar el encargo como un conjunto de trabajos coordinados entre departamentos.

## UX objetivo

Vista `Mapa de trabajo` dentro del encargo:

```text
ENCARGO: Lanzar nueva feature de onboarding
│
├── Estrategia
│   └── Investigación de mercado ✓
│
├── Producto
│   └── Especificación UX ⏳
│
├── Ingeniería
│   └── Implementación 🔒 esperando Producto
│
└── Marketing
    └── Mensajes de lanzamiento ⏸ esperando posicionamiento
```

Cada departamento aparece como una tarjeta con:

- Responsable.
- Estado.
- Última actualización.
- Próximo entregable.
- Dependencias.
- Coste.
- Última actividad.
- Botón `Pedir actualización`.
- Botón `Reasignar`.
- Botón `Desbloquear`.

## Modelo

Evaluar entidades:

- `DepartmentWorkItem`.
- `parentRunId` / `parentWorkItemId`.
- `departmentId` / `orgUnitId`.
- `assignedAgentId`.
- `status`.
- `dependsOnId`.
- `deliverableIds`.
- `lastActivityAt`.
- `completedAt`.

Las dependencias deben soportar bloqueo explícito y evitar que el DAG técnico vuelva a ser el centro de la UX.

## UI

Crear:

- `EncargoWorkMap`.
- `DepartmentWorkCard`.
- `DepartmentWorkDependency`.
- `DepartmentWorkDrawer`.

El mapa debe ser un mapa de colaboración empresarial, no un editor de workflow genérico.

## Validación

- Crear un encargo padre con al menos dos trabajos departamentales.
- Un trabajo de Ingeniería queda bloqueado hasta aceptar la entrega de Producto.
- El usuario ve claramente quién espera a quién.
- Los costes se agregan por trabajo y departamento.

---

# Fase C — Handoffs explícitos entre departamentos ✅ (2026-10-03, `DepartmentHandoff` + UI aceptar/aclarar/rechazar/completar)

## Objetivo

Convertir los handoffs en objetos trazables y accionables.

## Estructura mínima

```text
De: Estrategia
Para: Producto
Motivo: investigación completada
Entregables: research.md, insights.md
Decisiones tomadas: segmento objetivo B2B
Pregunta abierta: ¿priorizar Slack o Teams?
Estado: pendiente de aceptación
```

## Estados

```text
Borrador
Enviado
Pendiente de aceptación
Aceptado
Necesita aclaración
Rechazado
Completado
```

## Acciones receptoras

- Aceptar handoff.
- Pedir aclaración.
- Rechazar con motivo.
- Convertir pregunta en checkpoint.
- Crear trabajo derivado.
- Vincular documento o snapshot.

## Backend

Crear o evaluar:

- `DepartmentHandoff`.
- `fromWorkItemId`.
- `toWorkItemId`.
- `fromDepartmentId`.
- `toDepartmentId`.
- `status`.
- `message`.
- `openQuestions`.
- `artifactIds`.
- `acceptedBy`.
- `acceptedAt`.
- `createdAt`.

Registrar cada transición en actividad/auditoría.

## UI

Crear:

- `HandoffCard`.
- `HandoffInboxItem`.
- `HandoffComposer`.
- `HandoffDetailDrawer`.

Mostrar handoffs en:

- Encargo.
- Trabajo departamental.
- Inbox.
- Timeline.
- Departamento emisor y receptor.

## Validación

- Un handoff pendiente genera una acción visible para el departamento receptor.
- Aceptarlo desbloquea el trabajo dependiente.
- Pedir aclaración crea una interacción trazable.
- Los artefactos transferidos conservan autoría y snapshot.

---

# Fase D — Inbox empresarial ✅ (2026-10-03, read-model `/office/inbox` + OfficeInboxPage con filtros, badge accionable y resolución en línea)

## Objetivo

Crear una bandeja central para excepciones y acciones humanas.

## Categorías

```text
Requiere tu decisión
Handoffs pendientes
Bloqueados
Para revisar
Alertas de coste
Fallos
Informativo
```

## Eventos que deben entrar

- Handoff pendiente.
- `ask_human`.
- `propose_decision`.
- Documento pendiente de revisión.
- Encargo bloqueado.
- Presupuesto al 50%, 80% y 100%.
- Sesión fallida o agotada.
- Nueva entrega departamental.
- Solicitud de aclaración.

## UI

Crear página o panel:

- `/office/inbox`.
- `OfficeInboxPage`.
- `OfficeInboxFilters`.
- `OfficeInboxItem`.
- `OfficeInboxGroup`.

El badge de navegación debe mostrar solo acciones que requieran atención, no toda actividad técnica.

## Validación

- El usuario puede resolver una acción sin navegar a debug.
- Las acciones se agrupan por prioridad y antigüedad.
- Resolver una acción actualiza el trabajo relacionado.
- Se conserva historial de quién resolvió qué.

---

# Fase E — Organigrama y mapa de departamentos

## Objetivo

Hacer visible la empresa, sus líneas de responsabilidad y su colaboración.

## Vista propuesta

Ruta: `/office/company` o `/org-chart`.

Contenido:

- CEO/coordinador.
- Departamentos.
- Managers.
- Especialistas.
- Líneas de reporte.
- Límites de autoridad.
- Trabajos activos.
- Handoffs entrantes y salientes.

Tarjeta de departamento:

- Misión.
- Responsabilidades.
- Equipo.
- Encargos activos.
- Handoffs entrantes.
- Handoffs salientes.
- Procedimientos.
- Coste.
- Entregables recientes.

## UI

Crear o ampliar:

- `CompanyOrgChart`.
- `DepartmentOrgCard`.
- `DepartmentHealthSummary`.
- `DepartmentCollaborationMap`.

La vista actual de oficina sigue siendo la recepción/floor plan; el organigrama será la vista de gestión estructural.

## Validación

- Se entiende quién reporta a quién.
- Se puede abrir un departamento desde el organigrama.
- La actividad departamental es accionable, no solo decorativa.
- Las conexiones interdepartamentales muestran flujo de trabajo real.

---

# Fase F — Objetivos, proyectos e iniciativas

## Objetivo

Conectar cada encargo con el resultado empresarial que persigue.

## Jerarquía

```text
Objetivo: aumentar activación al 40%
  ├── Iniciativa: rediseñar onboarding
  │     ├── Investigación de abandono
  │     ├── Nuevo flujo UX
  │     └── Implementación de tracking
  └── Iniciativa: mejorar emails
```

## UX

En la recepción de encargos preguntar opcionalmente:

> ¿A qué objetivo o iniciativa contribuye?

Mostrar el objetivo en:

- Encargo.
- Prompt de agentes.
- War room.
- Entrega.
- Dashboard.

## Modelo

Evaluar:

- `CompanyGoal`.
- `Initiative`.
- `goalId` en trabajo/encargo.
- `initiativeId` en trabajo/encargo.
- Métrica objetivo.
- Progreso reportado.
- Estado y responsable.

## Validación

- Un encargo puede vincularse a un objetivo.
- La jerarquía objetivo → iniciativa → encargo es navegable.
- Los agentes reciben el contexto del objetivo.
- Se puede ver el coste y progreso por objetivo.

---

# Fase G — Revisión de documentos y feedback anclado ✅ (2026-10-03, DocumentReview + DocumentComment con ancla JSON y clave canónica file:/rev:/step:)

## Objetivo

Convertir los documentos de agentes en productos revisables, no markdown descartable.

## Capacidades

- Comentarios por documento.
- Comentarios anclados a sección o línea.
- Solicitud de cambios.
- Aprobación.
- Rechazo.
- Historial de revisiones.
- Comparación entre versiones.
- Autor y snapshot por versión.
- Convertir comentario en trabajo.

## Estados de revisión

```text
Pendiente de revisión
Cambios solicitados
Aprobado
Rechazado
```

## UX ejemplo

```text
research.md
[Solicitar cambios] [Aprobar]

Comentario en §3:
"Separar usuarios SMB de enterprise."
→ Convertir en tarea para Estrategia
```

## Validación

- Un comentario queda vinculado a una versión concreta.
- Una nueva versión no borra comentarios históricos.
- Solicitar cambios crea trabajo trazable.
- Aprobar un documento puede desbloquear el siguiente departamento.

---

# Fase H — Dashboard de empresa y métricas departamentales

## Objetivo

Pasar de un pulso de actividad a un dashboard de management.

## Métricas

- Objetivos activos.
- Encargos en curso.
- Trabajos bloqueados.
- Handoffs pendientes.
- Aprobaciones pendientes.
- Presupuesto usado.
- Entregas recientes.
- Salud por departamento.
- Tiempo medio de handoff.
- Tiempo en estado bloqueado.
- Ratio de entregas aprobadas al primer intento.

## Tabla departamental

```text
Departamento  Activos  Bloqueados  Coste  Entregados
Estrategia       3          1       $2.10      8
Producto         2          0       $1.40      5
Ingeniería       4          2       $8.60     11
Marketing        1          0       $0.80      3
```

## Validación

- Todas las métricas se filtran por periodo.
- Se puede abrir el trabajo detrás de cada métrica.
- Los costes cuadran con sesiones y runs.
- Un departamento bloqueado aparece antes que uno simplemente inactivo.

---

# Fase I — Operaciones recurrentes por departamento

## Objetivo

Presentar schedules como operaciones de negocio, no como cron técnico.

## UX

```text
Operaciones de Marketing
├── Informe semanal de métricas
├── Revisión diaria de leads
└── Newsletter mensual
```

Cada operación muestra:

- Departamento propietario.
- Responsable.
- Frecuencia.
- Última ejecución.
- Próxima ejecución.
- Resultado.
- Coste medio.
- Estado pausado/activo.
- Motivo de pausa si falla o supera presupuesto.

## UI

Crear o ampliar:

- `DepartmentOperationsPanel`.
- `RoutineCard`.
- `RoutineRunHistory`.
- `RoutineHealthBadge`.

## Validación

- Una rutina crea trabajo visible en el departamento.
- Cada ejecución tiene historial y entrega.
- Fallos y costes aparecen en Inbox.
- Pausar una operación explica el motivo.

---

# Fase J — Coste empresarial y búsqueda global

## Coste

Filtros por:

```text
Empresa | Departamento | Encargo | Proyecto | Objetivo | Agente | Modelo
```

Alertas:

- 50% del presupuesto.
- 80%.
- 100%.
- Predicción de coste final.
- Baja relación coste/entrega.

## Búsqueda global

Atajo: `⌘K` / `Ctrl+K`.

Buscar:

- Encargos.
- Documentos.
- Agentes.
- Departamentos.
- Decisiones.
- Handoffs.
- Comentarios.
- Objetivos.
- Runs.

Consultas útiles:

```text
encargos bloqueados de ingeniería
documentos de estrategia sobre onboarding
qué está esperando aprobación
```

## Validación

- Los resultados muestran tipo, departamento, estado y fecha.
- La búsqueda respeta tenant y permisos.
- Un resultado lleva directamente al contexto correcto.
- Los eventos técnicos no saturan los resultados de trabajo.

---

# Orden recomendado de ejecución

## Corte 1 — Cambiar la unidad mental ✅ (2026-10-03)

1. Fase A: encargo como centro de trabajo. ✅ completa (paneles work/handoffs + riel de estado empresarial + bloqueadores + participantes + timeline unificado)
2. Fase B: trabajos por departamento. ✓ (`DepartmentWorkItem` + `DepartmentWorkMapPanel`)
3. Fase C: handoffs explícitos. ✓ (`DepartmentHandoff` + acciones aceptar/aclarar/rechazar/completar)

**Resultado esperado:** un encargo puede coordinar varios departamentos y cada transición es visible.

**Estado:** implementado y validado (backend `tsc --noEmit` limpio, frontend `tsc -b` limpio, 212 tests: 206 pasan / 0 fallan / 6 omitidos). Pendiente de QA manual con `DATABASE_URL` real para el flujo de 3 departamentos y handoffs.

## Corte 2 — Hacer accionable la gestión humana ✅ (2026-10-03)

4. Fase D: Inbox empresarial. ✓ (`src/lib/office-inbox.ts` read-model sobre checkpoints/decisiones/handoffs/bloqueos/revisiones/notificaciones, `GET /office/inbox` con filtro por categoría, `OfficeInboxPage` con badge accionable, resolución en línea de decisiones/handoffs, redirecciones `/office/pendientes` y `/decisions`)
5. Fase G: revisión y feedback de documentos. ✓ (`DocumentReview` + `DocumentComment` con ancla JSON, únicos por `[tenantId, runId, docKey, versionSha]`, claves canónicas `file:`/`rev:`/`step:`, endpoints de revisión/comentario/resolver/convertir, `DocumentReviewPanel` en la pestaña Archivos)

**Resultado esperado:** el humano gestiona decisiones, bloqueos, handoffs y revisiones desde un único lugar.

**Estado:** implementado y validado (commit `4e3c42b`, backend `tsc --noEmit` limpio, frontend `tsc -b` limpio, `prisma validate` OK, 212 tests: 206 pasan / 0 fallan / 6 omitidos, 3 nuevos requieren `DATABASE_URL`). Pendiente de QA manual con `DATABASE_URL` real: aplicar la migración `20261003090000_document_reviews` y recorrer decisión → handoff → revisión de documento → convertir comentario en trabajo.

## Corte 3 — Hacer visible la empresa

6. Fase E: organigrama y mapa departamental.
7. Fase H: dashboard de empresa.

**Resultado esperado:** se entiende la estructura, salud y colaboración de la compañía.

## Corte 4 — Alinear y escalar

8. Fase F: objetivos e iniciativas. ✅ (2026-10-03, commit `e8a30f0`)
9. Fase I: operaciones recurrentes. 🟡 panel por departamento + historial por workflow (2026-10-04).
10. Fase J: coste empresarial y búsqueda global. 🟡 costes/alertas + búsqueda ampliada (2026-10-04).

### Referencias de código
- `src/lib/objectives.ts` – modelo Prisma y funciones CRUD.
- `src/server/routes/office.ts` – endpoints HTTP.
- `frontend/src/components/office/ObjectiveForm.tsx` / `InitiativeForm.tsx` – formularios UI.
- `frontend/src/pages/OfficeObjectivesPage.tsx` / `OfficeInitiativesPage.tsx` – páginas de listado y creación.
- `docs/cto/objectives-initiatives.md` – documentación de arquitectura.
- `docs/product/strategic-dashboard.md` – documentación de UI.

### QA para fase F
- Ejecutar pruebas unitarias de CRUD (`tests/office‑objectives.test.ts`, `tests/office‑initiatives.test.ts`).
- Verificar manualmente con un `DATABASE_URL` real que los endpoints persisten los datos.
- Confirmar que la UI muestra correctamente la lista tras crear/editar/eliminar.


**Resultado esperado:** la empresa puede operar de forma continua y orientada a objetivos.

---

# Criterios de éxito globales

- Un encargo interdepartamental se entiende sin abrir debug.
- Se puede responder a un handoff desde Inbox.
- Un trabajo bloqueado explica exactamente quién debe actuar.
- Cada documento importante tiene autor, versión, revisión y snapshot.
- Se puede navegar objetivo → iniciativa → encargo → trabajo → entrega.
- El coste se puede explicar por empresa, departamento y encargo.
- El usuario puede gestionar la empresa desde móvil sin inspeccionar sesiones individuales.
- La interfaz comunica una empresa de departamentos, no una colección de agentes ejecutando prompts.

---

# Primera implementación recomendada

Implementar el primer corte vertical con el menor modelo nuevo posible:

1. Añadir `businessStatus`, `ownerDepartment`, `nextAction` y `blockedReason` al contexto del encargo, o reutilizar campos existentes.
2. Crear `DepartmentWorkItem` como subtarea departamental vinculada al `ExecutionRun` padre.
3. Crear `DepartmentHandoff` con aceptación y solicitud de aclaración.
4. Mostrar `Mapa de trabajo` dentro de `OfficeEncargoDetailPage`.
5. Añadir timeline de handoffs y eventos.
6. Añadir un Inbox mínimo solo para handoffs, checkpoints y bloqueos.
7. Validar con un flujo real de tres departamentos: Estrategia → Producto → Ingeniería.

No avanzar a objetivos, rutinas, búsqueda o dashboards complejos hasta que este flujo interdepartamental sea claro y estable.

---

# Riesgos

- **Sobremodelar demasiado pronto:** reutilizar `ExecutionRun`, `AgentSession`, `RunCheckpoint`, `WorkspaceSnapshot` y eventos antes de crear entidades nuevas.
- **Volver al DAG técnico:** el mapa debe comunicar negocio y dependencias, no pasos internos del executor.
- **Duplicar estados:** definir una fuente de verdad para estado empresarial y estado técnico.
- **Inbox ruidoso:** incluir acciones que requieren intervención, no cada evento de tool.
- **Departamentos como decoración:** cada departamento debe tener ownership, trabajos, handoffs y métricas.
- **Automatización sin resultado:** toda rutina debe crear un trabajo visible con entrega y revisión.

---

# Próximo paso

Corte 1 (Fase A + B + C) ✅ completado el 2026-10-03: `DepartmentWorkItem`, `DepartmentHandoff`, endpoints `/office/runs/:runId/work`, `/office/runs/:runId/handoffs`, `/office/handoffs/:handoffId` y panel `DepartmentWorkMapPanel` montado en `OfficeEncargoDetailPage`.

Corte 2 (Fase A completa + D + G) ✅ completado el 2026-10-03 en `4e3c42b`: timeline y columna lateral de estado empresarial, Inbox accionable, revisión de documentos con comentarios anclados y conversión a trabajo departamental.

Siguiente: **Corte 3 — Fases E + H** para hacer visible la estructura, salud y colaboración de la compañía: organigrama/mapa departamental y dashboard empresarial.

QA manual pendiente cuando exista un `DATABASE_URL` válido: aplicar la migración `20261003090000_document_reviews`, recorrer el flujo de 3 departamentos (Estrategia → Producto → Ingeniería), enviar/aceptar un handoff y verificar decisión → revisión → comentario → trabajo.

---

# Pendientes detectados (auditoría 2026-10-03)

> Resultado de la validación de Corte 3 y Corte 4 tras los commits `e8a30f0`, `8a417f0`, `78df7b9` y `011b351`. El build técnico pasa (`npm run build` limpio, backend `tsc --noEmit` limpio, frontend `tsc -b` limpio), pero la funcionalidad está incompleta respecto al alcance definido en las Fases E, F, H, I y J.

## Estado por fase

| Fase | Estado | Resumen |
|---|---|---|
| E — Organigrama y mapa departamental | ⚠️ Parcial | Endpoints y UI básicos existen; páginas no routeadas y sin jerarquía real. |
| F — Objetivos, proyectos e iniciativas | ⚠️ Parcial | CRUD completo; sin vínculo a encargos, sin migración, sin tests ni docs. |
| H — Dashboard de empresa | ⚠️ Parcial | Endpoint con 5 métricas básicas; faltan métricas de management y filtros. |
| I — Operaciones recurrentes | ❌ No implementada | Sin `DepartmentOperationsPanel`, `RoutineCard`, historial ni pausado. |
| J — Coste empresarial y búsqueda global | ❌ No implementada | Sin búsqueda `⌘K`, sin filtros de coste, sin alertas 50/80/100%. |

## Bloqueo crítico (prioridad 1)

### P1 — Migración Prisma de `CompanyGoal` e `Initiative` no existe

- Los modelos están en `prisma/schema.prisma` (líneas 66–92) pero **no hay migración** en `prisma/migrations/` que cree las tablas `company_goals` ni `initiatives`.
- El contenedor de producción ejecuta `prisma migrate deploy` vía `docker/api/entrypoint.sh` (no `db push`), por lo que los endpoints `/office/objectives` y `/office/initiatives` **fallarán en runtime** contra la base de producción.
- **Acción:** generar y commitear la migración (`npx prisma migrate dev --name add_company_goals_initiatives`) y validarla contra un `DATABASE_URL` real.

## Corte 3 — pendientes

### P2 — Rutas de organigrama y dashboard no registradas en `App.tsx` ✅ Resuelto (`a493c51`)

- Se registraron `/office/dashboard` y `/office/organigrama` en `frontend/src/App.tsx`.
- El sidebar incluye el grupo Estrategia con Dashboard, Organigrama, Objetivos e Iniciativas, con traducciones es/en e iconos.


### P3 — Organigrama sin jerarquía real (Fase E incompleta) ✅ Parcialmente resuelto

- Añadido `OrgUnit.parentId` nullable con relación self-referencing `OrgHierarchy`, índice por tenant y FK `ON DELETE SET NULL`.
- Nueva migración `20261004120000_org_unit_hierarchy` para producción.
- `getOrganigram` ahora devuelve un árbol real con `children`, `parentId` y conteo de work items; valida tenant y evita ciclos al actualizar.
- UI de settings permite asignar/quitar el departamento padre, excluyendo el propio nodo y sus descendientes.
- `OrganigramMap` usa tipos reales y muestra la estructura anidada.
- Pendiente Fase E: CEO/coordinador, salud departamental, colaboración, handoffs y tarjetas enriquecidas.


### P4 — Dashboard de empresa incompleto (Fase H incompleta)

- `src/lib/dashboard.ts` solo calcula: `totalCostUsd`, `activeRuns`, `pendingDecisions`, `pendingHandoffs`, `pendingReviews`.
- Faltan métricas del plan: objetivos activos, trabajos bloqueados, entregas recientes, salud por departamento, tiempo medio de handoff, tiempo en estado bloqueado, ratio de entregas aprobadas al primer intento.
- No hay tabla departamental (Departamento × Activos/Bloqueados/Coste/Entregados).
- No hay filtro por periodo en el endpoint ni en el componente `Dashboard.tsx`.
- No hay drill-down: las métricas no enlazan al trabajo/inbox que las origina.
- **Conflicto activo:** el commit `011b351` cambió `GET /office/dashboard` para usar `getOfficeDashboard` (de `office-coordinator.ts`, forma `OfficeDashboard`: `mode`, `usage`, `stats`, `activity`, `roi`, `agents`, `departments`), pero el componente `frontend/src/components/office/Dashboard.tsx` espera la forma mínima de `getDashboardMetrics` (`totalCostUsd`, `activeRuns`, `pendingDecisions`, `pendingHandoffs`, `pendingReviews`). Hay que decidir un único contrato: o el componente consume `getOfficeDashboard`, o el endpoint vuelve a `getDashboardMetrics`. Tal como está, el dashboard de empresa mostrará `undefined` en todas las tarjetas.
- **Acción:** unificar contrato endpoint↔componente y luego extender `getDashboardMetrics` (o `getOfficeDashboard`) con las métricas de management de la Fase H, agregadas por periodo y por departamento.

### P5 — Tests de Corte 3 rotos (usen Jest en un proyecto sin Jest)

- `tests/office-dashboard.test.ts` y `tests/office-organigram.test.ts` usan `jest.mock` / `describe` / `it` de Jest, pero el proyecto ejecuta tests con `node:test` vía `tsx --test` (convención de `tests/office-inbox.test.ts`).
- Al ejecutarlos fallan inmediatamente con `ReferenceError: jest is not defined`; no validan nada hoy.
- Además, el test de organigrama mockea `parentId`/`children` que ya no existen en el schema ni en la implementación reescrita.
- **Acción:** reescribir ambos tests con `node:test` + `assert/strict` (puros, sin `DATABASE_URL` como el resto de la suite) y alinearlos con la implementación real de `organigram.ts`/`dashboard.ts`.

## Corte 4 — pendientes

### P6 — Fase F incompleta: sin vínculo objetivo → iniciativa → encargo

- `CompanyGoal` e `Initiative` solo se relacionan entre sí; no existe `goalId`/`initiativeId` en `ExecutionRun`, `DepartmentWorkItem`, encargos ni entregas.
- La jerarquía exigida `Objetivo → Iniciativa → Encargo → Trabajo → Entrega` no es navegable: los objetivos son un CRUD aislado.
- No se pregunta "¿a qué objetivo o iniciativa contribuye?" al crear un encargo (UX de Fase F).
- El objetivo no se propaga a: prompt de agentes, War Room, detalle de encargo, entrega ni dashboard.
- No hay coste ni progreso agregado por objetivo (`currentValue` existe en el modelo pero nada lo actualiza).
- **Acción:** añadir `goalId`/`initiativeId` (con migración) al modelo de trabajo elegido, incluir el selector en la creación de encargos, inyectar el contexto del objetivo en el brief/prompt y exponer coste+progreso por objetivo.

### P7 — Fase F sin tests ni documentación comprometida

- El plan exige `tests/office-objectives.test.ts` y `tests/office-initiatives.test.ts` como QA de la fase: **no existen**.
- El plan referencia `docs/cto/objectives-initiatives.md` y `docs/product/strategic-dashboard.md`: **no existen** en el repo (solo está `architecture/organigram-dashboard.json` de Corte 3).
- **Acción:** crear los dos tests con la convención `node:test` del proyecto (CRUD con mock de prisma o contra `DATABASE_URL` real) y redactar las dos docs; actualizar `INDEX.md`/`TO_DO.md` si aplica.

### P8 — Fase I no implementada: operaciones recurrentes por departamento

- No existe ningún componente `DepartmentOperationsPanel`, `RoutineCard`, `RoutineRunHistory` ni `RoutineHealthBadge` (verificado por búsqueda en `frontend/src` y `src`).
- La infraestructura subyacente existe (`AutonomousSchedule`, worker BullMQ, scheduler) pero no está expuesta como **operaciones de negocio** por departamento: falta vista "Operaciones de Marketing/Producto/…", responsable, frecuencia, última/próxima ejecución, resultado, coste medio, estado pausado/activo y motivo de pausa.
- Falta el requisito de que una rutina cree trabajo visible en el departamento con historial y entrega, y que fallos/costes aparezcan en el Inbox.
- **Acción:** construir el read-model de operaciones sobre `AutonomousSchedule` + historial de runs, y los 4 componentes UI, enlazando cada ejecución a su `ExecutionRun`/entrega.

### P9 — Fase J parcial: coste empresarial y búsqueda global

- **Hecho:** `GET /office/costs` (`office-costs.ts`) con filtros y desglose; alertas 50/80/100%; `OfficeCostsPanel`; búsqueda ampliada (decisiones, handoffs, agentes, artefactos).
- **Pendiente:** filtro por modelo LLM; predicción de coste; comentarios en búsqueda.

## Pendientes transversales

- **Navegación:** el sidebar no enlaza a ninguna página de Corte 3/4 (`estrategia`, `objetivos`, `iniciativas`, `organigrama`, `dashboard`); las páginas son inalcanzables para el usuario salvo URL directa.
- **QA manual sin `DATABASE_URL`:** los flujos de Corte 2 (handoffs, revisiones) y los nuevos CRUD de Corte 4 siguen sin validar contra base real.
- **Docs desactualizadas:** marcar en este plan las fases E/F/H como completas cuando se cierren sus pendientes, y anotar los commits correspondientes (hoy solo F está marcada ✅ con `e8a30f0`, pero incompleta según esta auditoría).

## Orden sugerido de desbloqueo

1. **P1** — migración de `CompanyGoal`/`Initiative` (bloquea runtime en producción).
2. **P4 (contrato dashboard)** — decidir y unificar el contrato de `/office/dashboard` (evita UI rota en el despliegue actual).
3. **P2** — routear y enlazar organigrama + dashboard.
4. **P3** — jerarquía real del organigrama (requiere decidir modelo + migración).
5. **P5** — reparar tests de Corte 3 con `node:test`.
6. **P6** — vínculo objetivo → iniciativa → encargo (requiere migración).
7. **P7** — tests + docs de Fase F.
8. **P8** — Fase I (operaciones recurrentes).
9. **P9** — Fase J (coste + búsqueda global).

