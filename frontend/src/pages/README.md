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

Sidebar groups (see `AppSidebar.tsx`): **Empresa autónoma** (ops → products → war room → decisions → runs), **Memoria** (consensus), **Catálogo IA** (workflows, agents, skills), **Administración** (settings, team). Default landing after login: `/ops`.

| Route | Page |
|-------|------|
| `/workflows` | `WorkflowsPage` |
| `/workflows/:id` | `WorkflowEditorPage` |
| `/agents` | `AgentsPage` |
| `/skills` | `SkillsPage` |
| `/runs` | `RunsPage` |
| `/runs/:id` | `RunDetailPage` |
| `/ops` | `OpsPage` | Ciclo meta, KPIs, **programaciones**, stepper de fases, ejecuciones recientes |
| `/products` | `ProductsPage` | Oportunidades; **Añadir producto** (registrar existente o crear nuevo); productos activos con launcher de workflows/agentes |
| `/war-room/:productId` | `WarRoomPage` | War room táctico + **launcher** de workflows/agentes por producto |
| `/products/:id/consensus` | `ProductConsensusPage` | Memoria del producto (documento, revisiones, informes BD, **documentos docs/**) |
| `/products/:id/code` | `ProductCodePage` | Código en workspace |
| `/products/:id/team` | `ProductTeamPage` | Redirige a `/war-room/:id` |
| `/decisions` | `DecisionsPage` | Propuestas go/no-go de agentes |
| `/consensus` | `ConsensusPage` | Consenso del tenant |
| `/settings` | `SettingsPage` | LLM, **OpenCode**, notificaciones, límites, programaciones |
| `/team` | `TenantUsersPage` |
