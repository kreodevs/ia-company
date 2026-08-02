# Pages

Route-level screens for the Auto-Company frontend.

## Admin (super-admin)

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | `SuperAdminDashboardPage` | Platform overview and tenants |
| `/admin/settings` | `PlatformSettingsPage` | Platform config with tabs: General, LLM, Email, Integrations (GitHub), OpenCode |
| `/admin/templates` | `PlatformTemplatesPage` | Agent and skill templates + sync to tenants |
| `/admin/templates/workflows` | `PlatformWorkflowTemplatesPage` | Platform workflow templates (list/create) |
| `/admin/templates/workflows/:id` | `PlatformWorkflowEditorPage` | Visual editor for a platform workflow |

## Tenant workspace

Sidebar groups (see `AppSidebar.tsx`): **Oficina** (home, **Mis pendientes**, encargos, war room, products, deptos), **Oficina de depuración** (runs, ops…), **Administración** (settings, **Procedimientos**, **Plantilla de especialistas**, team). Default landing after login: `/office`.

| Route | Page |
|-------|------|
| `/` · `/office` | `OfficePage` — coordinador en contexto general; chat central crece con el viewport |
| `/office/pendientes` | `PendingDecisionsPage` — bandeja Go/No-Go con pestañas Por aprobar / Aprobadas / Rechazadas |
| `/office/encargos` | `OfficeEncargosPage` — lista con selección múltiple y borrado (incluye docs asociados) |
| `/office/encargos/:runId` | `OfficeEncargoDetailPage` |
| `/office/workflows` | redirect → `/settings/procedures` |
| `/office/workflows/:id` | `WorkflowEditorPage` |
| `/settings/procedures` | `ProceduresSettingsPage` — catálogo agrupado por departamento |
| `/settings/specialists` | `AiTeamHubPage` — tabs Agentes, Habilidades, Catalog Studio |
| `/ai-team` · `/agents` · `/skills` | redirect → `/settings/specialists` |
| `/runs` | `RunsPage` |
| `/runs/:id` | `RunDetailPage` |
| `/ops` | `OpsPage` | Ciclo meta, KPIs, **programaciones**, stepper de fases, ejecuciones recientes |
| `/products` | `ProductsPage` | Oportunidades; **Añadir producto**; productos activos con enlaces a war room, código y **configuración** |
| `/products/:id/settings` | `ProductSettingsPage` | Tabbed settings: general, intake, revenue, OpenCode |
| `/war-room/:productId` | `WarRoomPage` | War room táctico + **chat del coordinador** (encargos bajo demanda) |
| `/debug/products/:id/consensus` | `ProductConsensusPage` | Memoria técnica del producto (solo depuración) |
| `/products/:id/code` | `ProductCodePage` | Código en workspace |
| `/products/:id/team` | `ProductTeamPage` | Redirige a `/war-room/:id` |
| `/decisions` | redirect → `/office/pendientes` |
| `/debug/decisions` | `DecisionsPage` | Vista debug con KPIs (depuración) |
| `/consensus` | `ConsensusPage` | Consenso del tenant |
| `/settings` | `SettingsPage` | LLM, **OpenCode**, notificaciones, límites, programaciones |
| `/team` | `TenantUsersPage` |
