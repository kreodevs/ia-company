# Auto-Company Frontend

React dashboard for managing AI agents, visual workflows, and execution monitoring.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **React Flow** (`@xyflow/react`) — workflow canvas editor
- **Tailwind CSS v4** — styling via `@tailwindcss/vite`
- **React Router** — client-side routing

## Auth & multi-tenant

Two login modes at `/login`:

| Mode | API | Access |
|------|-----|--------|
| **Organization** | `POST /auth/tenant/login` | Tenant slug + email + password → workflows directly |
| **Superadmin** | `POST /auth/login` | Platform admin + tenant impersonation select |

| Route | Purpose |
|-------|---------|
| `/setup` | First superadmin (auto-redirect if none exists) |
| `/admin` | Superadmin dashboard (superadmin only) |
| `/admin/templates` | `PlatformTemplatesPage` | Edit/create platform templates, reseed, sync to tenants |
| `/admin/templates/workflows/:id` | `PlatformWorkflowEditorPage` | React Flow canvas for global workflow templates |

## Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/agents` | `AgentsPage` | CRUD editor for agent personas, models, temperature, skills |
| `/skills` | `SkillsPage` | CRUD editor for tenant skill prompts |
| `/workflows` | `WorkflowsPage` | List workflows + create new empty workflow |
| `/workflows/:id` | `WorkflowEditorPage` | React Flow canvas — drag agents, connect nodes, save & execute |
| `/runs` | `RunsPage` | Historical execution runs with token/cost metrics |
| `/runs/:id` | `RunDetailPage` | SSE live log stream, shared memory, cancel run |
| `/consensus` | `ConsensusPage` | Edit tenant consensus memory (`memories/consensus.md` equivalent) |
| `/settings` | `SettingsPage` | Tenant LLM keys + autonomous workflow schedules (admin only) |
| `/admin/templates/workflows/:id` | `PlatformWorkflowEditorPage` | Superadmin — React Flow editor for global workflow templates |

Superadmin `/admin` includes an **audit log** table (`GET /api/admin/audit-logs`).

Workflow execute loads tenant **consensus** by default and syncs results back on completion.

## Components

- `AgentForm` — agent configuration form with skill multi-select
- `WorkflowCanvas` — React Flow graph editor with save to API

## Development

```bash
# From repo root (API must be running on :3001)
npm run dev:frontend

# Or from this directory
npm run dev
```

Vite proxies `/api` → `http://localhost:3001` (see `vite.config.ts`).

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL for production builds |
