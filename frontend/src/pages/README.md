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

Sidebar groups (see `AppSidebar.tsx`): **Oficina** (home, **Mis pendientes**, encargos, workflows, war room, products, deptos, **Equipo IA**), **Oficina de depuración** (runs, ops…), **Administración** (settings, team). Default landing after login: `/office`.

| Route | Page |
|-------|------|
| `/` · `/office` | `OfficePage` — coordinador en contexto general; opcionalmente filtra por departamento si hay org units |
| `/office/pendientes` | `PendingDecisionsPage` — bandeja Go/No-Go con pestañas Por aprobar / Aprobadas / Rechazadas |
| `/office/encargos` | `OfficeEncargosPage` |
| `/office/encargos/:runId` | `OfficeEncargoDetailPage` |
| `/office/workflows` | `WorkflowsPage` |
| `/office/workflows/:id` | `WorkflowEditorPage` |
| `/ai-team` | `AiTeamHubPage` — tabs Agentes, Habilidades, Catalog Studio |
| `/agents` · `/skills` | redirect → `/ai-team` |
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
