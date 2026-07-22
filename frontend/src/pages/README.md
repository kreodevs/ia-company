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
| `/ops` | `OpsPage` | Autonomous status, pipeline ideas, meta cycle (simplified layout) |
| `/consensus` | `ConsensusPage` |
| `/settings` | `SettingsPage` |
| `/team` | `TenantUsersPage` |
