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
| `/office/workflows` | `WorkflowsPage` | List workflows + create new empty workflow (Office nav) |
| `/office/workflows/:id` | `WorkflowEditorPage` | React Flow canvas — drag agents, connect nodes, save & execute |
| `/runs` | `RunsPage` | Historical execution runs with token/cost metrics |
| `/runs/:id` | `RunDetailPage` | SSE live log stream, shared memory, cancel run |
| `/consensus` | `ConsensusPage` | Edit tenant consensus memory (`memories/consensus.md` equivalent) |
| `/ops` | `OpsPage` | Multi-product portfolio, pipeline queue, meta-orchestrator preview |
| `/settings` | `SettingsPage` | Tenant LLM keys + meta/fixed autonomous schedules (admin only) |
| `/help` | `HelpPage` | Centro de ayuda — guía Oficina bajo demanda (markdown por secciones) |
| `/admin/templates/workflows/:id` | `PlatformWorkflowEditorPage` | Superadmin — React Flow editor for global workflow templates |

Superadmin `/admin` includes an **audit log** table (`GET /api/admin/audit-logs`).

Workflow execute loads tenant **consensus** by default and syncs results back on completion.

## Responsive UX

Shared UI primitives live in `src/components/ui/` (`Button`, `Input`, `Card`, `PageHeader`, `PageLoading`, `EmptyState`, `StatCard`, `StatusBadge`, `Badge`). Global layout tokens and accessibility helpers are in `src/index.css` (`.page-shell`, `.table-scroll`, skip link, focus-visible, `prefers-reduced-motion`).

| Breakpoint | Navigation | Data tables |
|------------|------------|-------------|
| **Mobile** (`< md`) | Hamburger drawer with section labels | Card lists (runs, tenants, users) |
| **Tablet** (`md`–`xl`) | Same drawer; wider content gutters | Horizontal scroll tables where needed |
| **Desktop** (`xl+`) | Full horizontal nav in `AppHeader` | Full tables with sticky header styling |

Touch targets use `min-h-11` (44px) on primary controls; forms stack vertically on small screens and align horizontally from `sm`/`md` up.

## Components

- `AppHeader` — sticky header; full nav on `xl+`, hamburger drawer with overlay on mobile/tablet
- `AgentForm` — agent configuration form with skill multi-select
- `WorkflowCanvas` — React Flow graph editor with save to API
- `WorkflowTemplateCard` — workflow list card with agent pipeline preview, search-friendly metadata, and explicit editor/delete actions (used on tenant `/office/workflows` and admin `/admin/templates`)
| `MarkdownDoc` — renders help articles (GFM markdown via `react-markdown` + `remark-gfm`); used per-section in Help with in-doc link navigation |
| Help sections | `lib/markdown-sections.ts` splits tutorials by `##` / `###`; sidebar switches visible section container |

## Help content

Articles live under `src/content/help/`:

| File | Route | Description |
|------|-------|-------------|
| `tutorial.md` / `tutorial.en.md` | `/help/guia-completa` | Guía completa: Oficina, productos GitHub, war room, `/debug/*`, schedules opcionales |

Register new articles in `src/content/help/index.ts`.

## Internationalization (i18n)

The UI uses **i18next** + **react-i18next** with Spanish (`es`) as the default locale.

| Item | Location |
|------|----------|
| i18n bootstrap | `src/i18n/index.ts` — imports locale bundles, reads `localStorage` key `auto-company-lang` |
| Locale files | `src/i18n/locales/{es,en}/` — modular namespaces merged in `index.ts` |
| Language switcher | `LanguageSwitcher` in `AppHeader` (next to tenant impersonation) |
| Document `lang` | `useDocumentLang()` in `AppShell`; initial `<html lang="es">` in `index.html` |
| Help articles | `getHelpArticles(i18n.language)` in `src/content/help/index.ts` |

Usage in components:

```tsx
import { useTranslation } from "react-i18next";

function MyPage() {
  const { t, i18n } = useTranslation();
  return <h1>{t("nav.workflows")}</h1>;
}
```

Translation keys follow nested paths, e.g. `common.loading`, `nav.agents`, `auth.login.title.organization`, `phase.exploring`, `status.COMPLETED`. Non-module utilities (e.g. `workflow-display.ts`) import the default i18n instance: `import i18n from "../i18n/index.js"`.

API errors that return generic English messages fall back to keys like `common.error.loginFailed` via `translateApiError()` in `src/lib/translate-error.ts`.

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
