# Pages

Route-level screens for the Auto-Company frontend.

## Admin (super-admin)

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | `SuperAdminDashboardPage` | Platform overview and tenants |
| `/admin/settings` | `PlatformSettingsPage` | LLM, email, GitHub, rate limits |
| `/admin/templates` | `PlatformTemplatesPage` | Agent and skill templates + sync to tenants |
| `/admin/templates/workflows` | `PlatformWorkflowTemplatesPage` | Platform workflow templates (list/create) |
| `/admin/templates/workflows/:id` | `PlatformWorkflowEditorPage` | Visual editor for a platform workflow |

## Tenant workspace

| Route | Page |
|-------|------|
| `/workflows` | `WorkflowsPage` |
| `/workflows/:id` | `WorkflowEditorPage` |
| `/agents` | `AgentsPage` |
| `/skills` | `SkillsPage` |
| `/runs` | `RunsPage` |
| `/runs/:id` | `RunDetailPage` |
| `/ops` | `OpsPage` | Ciclo meta, KPIs, **programaciones**, stepper de fases, ejecuciones recientes |
| `/products` | `ProductsPage` | Oportunidades (evaluar/NO-GO) y productos activos (enfocar, código, reportes) |
| `/war-room` | `WarRoomPage` | War room táctico con selector de producto |
| `/war-room/:productId` | `WarRoomPage` | War room de un producto concreto |
| `/products/:id/consensus` | `ProductConsensusPage` | Memoria del producto |
| `/products/:id/code` | `ProductCodePage` | Código en workspace |
| `/products/:id/team` | `ProductTeamPage` | Redirige a `/war-room/:id` |
| `/decisions` | `DecisionsPage` | Propuestas go/no-go de agentes |
| `/consensus` | `ConsensusPage` | Consenso del tenant |
| `/settings` | `SettingsPage` |
| `/team` | `TenantUsersPage` |
