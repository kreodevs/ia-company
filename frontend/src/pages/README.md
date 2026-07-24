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

Sidebar groups (see `AppSidebar.tsx`): **Office** (home), **Portfolio & ops** (ops → products → war room → decisions → runs), **Memoria** (consensus), **Catálogo IA** (workflows, agents, skills), **Administración** (settings, team). Default landing after login: `/office`.

| Route | Page |
|-------|------|
| `/` · `/office` | `OfficePage` | **Oficina bajo demanda** — coordinador, plan de equipo, presupuesto, actividad, ROI, servicios rápidos |
| `/workflows` | `WorkflowsPage` |
| `/workflows/:id` | `WorkflowEditorPage` |
| `/agents` | `AgentsPage` |
| `/skills` | `SkillsPage` |
| `/runs` | `RunsPage` |
| `/runs/:id` | `RunDetailPage` |
| `/ops` | `OpsPage` | Ciclo meta, KPIs, **programaciones**, stepper de fases, ejecuciones recientes |
| `/products` | `ProductsPage` | Oportunidades; **Añadir producto**; productos activos con enlaces a war room, código y **configuración** |
| `/products/:id/settings` | `ProductSettingsPage` | Datos generales, GitHub, re-ejecutar intake, OpenCode |
| `/war-room/:productId` | `WarRoomPage` | War room táctico + **chat del coordinador** (encargos bajo demanda) |
| `/debug/products/:id/consensus` | `ProductConsensusPage` | Memoria técnica del producto (solo depuración) |
| `/products/:id/code` | `ProductCodePage` | Código en workspace |
| `/products/:id/team` | `ProductTeamPage` | Redirige a `/war-room/:id` |
| `/decisions` | `DecisionsPage` | Propuestas go/no-go de agentes |
| `/consensus` | `ConsensusPage` | Consenso del tenant |
| `/settings` | `SettingsPage` | LLM, **OpenCode**, notificaciones, límites, programaciones |
| `/team` | `TenantUsersPage` |
