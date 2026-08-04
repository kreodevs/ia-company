# Pages

Route-level screens for the Auto-Company frontend.

## Admin (super-admin)

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | `SuperAdminDashboardPage` | Breadcrumbs, KPIs, secciones en `Panel`, `EmptyState` en tenants/audit |
| `/admin/settings` | `PlatformSettingsPage` | Breadcrumbs, `TabsBar` sticky, tabs en `Panel`, botón guardar Kreo |
| `/admin/templates` | `PlatformTemplatesPage` | Breadcrumbs, sync en `Panel`, `TabsBar` sticky, `EmptyState` |
| `/admin/templates/workflows` | `PlatformWorkflowTemplatesPage` | Breadcrumbs, búsqueda en `Panel`, `EmptyState` |
| `/admin/templates/workflows/:id` | `PlatformWorkflowEditorPage` | Breadcrumbs, metadata en `Panel`, canvas con tokens `--flow-canvas-*` |

## Tenant workspace

Sidebar groups (see `AppSidebar.tsx`): **Oficina** (home, **Mis pendientes**, encargos, war room, products, deptos), **Oficina de depuración** (runs, ops…), **Administración** (settings, **Procedimientos**, **Plantilla de especialistas**, team). Default landing after login: `/office`.

| Route | Page |
|-------|------|
| `/` · `/office` | `OfficePage` — coordinador en contexto general; KPIs enlazan a límites, encargos, pendientes, especialistas y productos; CTA a pendientes cuando hay decisiones |
| `/office/encargos/:runId` | `OfficeEncargoDetailPage` — PageHeader + Breadcrumbs, paneles office |
| `/office/pendientes` | `PendingDecisionsPage` — Breadcrumbs, filtros sticky, `EmptyState` |
| `/office/archive` | `OfficeArchivePage` — filtros colapsables, `EmptyState` |
| `/office/workflows` | redirect → `/settings/procedures` |
| `/office/workflows/:id` | `WorkflowEditorPage` — Breadcrumbs, panel ejecutar en `Panel`, canvas tokens |
| `/settings/procedures` | `ProceduresSettingsPage` — PageHeader + Panel por grupo de procedimientos |
| `/settings/specialists` | `AiTeamHubPage` — Breadcrumbs, `TabsBar` sticky, tabs Agentes/Habilidades/Studio |
| `/ai-team` · `/agents` · `/skills` | redirect → `/settings/specialists` |
| `/runs` | `RunsPage` |
| `/runs/:id` | `RunDetailPage` — Breadcrumbs, logs/memoria en `Panel` |
| `/ops` | `OpsPage` | Ciclo meta, KPIs, **programaciones**, stepper de fases, ejecuciones recientes |
| `/products` | `ProductsPage` | Oportunidades; **Añadir producto**; productos activos con enlaces a war room, código y **configuración** |
| `/products/:id/settings` | `ProductSettingsPage` | Tabbed settings: general, intake, revenue, OpenCode |
| `/war-room/:productId` | `WarRoomPage` | War room táctico + **chat del coordinador** (encargos bajo demanda) |
| `/debug/products/:id/consensus` | `ProductConsensusPage` | Memoria técnica del producto (solo depuración) |
| `/products/:id/code` | `ProductCodePage` | Código en workspace |
| `/products/:id/team` | `ProductTeamPage` | Redirige a `/war-room/:id` |
| `/decisions` | redirect → `/office/pendientes` |
| `/debug/decisions` | `DecisionsPage` — Breadcrumbs, KPIs, tokens `--warning` en timeline |
| `/consensus` | `ConsensusPage` | Consenso del tenant (Breadcrumbs + Panel) |
| `/settings` | `SettingsPage` | Breadcrumbs, TabsBar sticky, secciones en Panel Kreo |
| `/team` | `TenantUsersPage` — Breadcrumbs, invite en `Panel`, `EmptyState` |
| `/help` · `/help/:slug` | `HelpPage` — Breadcrumbs, TOC sidebar sticky (`.help-sidebar-sticky`), contenido en `Panel` |
