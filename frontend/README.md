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
| `/admin/settings` | `PlatformSettingsPage` | Superadmin — LLM keys, email, public URL, rate limits |
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
| `/ops` | `OpsPage` | Multi-product portfolio, pipeline queue, meta-orchestrator preview |
| `/settings` | `SettingsPage` | Tenant LLM keys + meta/fixed autonomous schedules (admin only) |
| `/help` | `HelpPage` | Centro de ayuda — tutoriales en markdown |
| `/admin/templates/workflows/:id` | `PlatformWorkflowEditorPage` | Superadmin — React Flow editor for global workflow templates |

Superadmin `/admin` includes an **audit log** table (`GET /api/admin/audit-logs`).

Workflow execute loads tenant **consensus** by default and syncs results back on completion.

## Components

- `AppHeader` — responsive top navigation (horizontal on `md+`, hamburger drawer on mobile/tablet)
- `AgentForm` — agent configuration form with skill multi-select
- `WorkflowCanvas` — React Flow graph editor with save to API
- `WorkflowTemplateCard` — workflow list card with agent pipeline preview, search-friendly metadata, and explicit editor/delete actions (used on tenant `/workflows` and admin `/admin/templates`)
- `MarkdownDoc` — renders help articles (GFM markdown via `react-markdown` + `remark-gfm`)

## Help content

Articles live under `src/content/help/`:

| File | Route | Description |
|------|-------|-------------|
| `tutorial.md` | `/help/guia-completa` | Guía completa de la plataforma |

Register new articles in `src/content/help/index.ts`.

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
