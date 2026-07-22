# Auto-Company Platform (v2)

Multi-tenant web platform inspired by [MaxMiksa/Auto-Company](https://github.com/MaxMiksa/Auto-Company). This document covers **only** the platform stack — not the original CLI/daemon workflow (see root `README.md`).

## Architecture

```
Browser (React + React Flow)
        ↓
   nginx / Vite proxy
        ↓
   Fastify API (:3001)
        ↓
   PostgreSQL (Prisma)     Redis (BullMQ)
        ↓                        ↓
   Tenant data              Worker + Scheduler
                                   ↓
                            WorkflowExecutor → LLM providers
                                   ↓
                            projects/{tenant-slug}/  (per-tenant workspace)
```

## Autonomous cycle (consensus)

Each tenant has a `TenantConsensus` record — the platform equivalent of `memories/consensus.md`.

| Step | Behavior |
|------|----------|
| **Execute workflow** | Loads consensus into `initialMemory` (`nextAction`, `consensus`, `task`) |
| **Run steps** | Agents share memory; tools run in tenant workspace |
| **Complete** | Appends cycle summary (or `consensusUpdate`) back to consensus |
| **Schedule** | Worker scheduler runs workflows on interval with the same consensus flow |

Manual execute from the workflow editor uses **Load & sync tenant consensus** by default.

## Multi-product autonomous company

Tenants can run a **portfolio** of products under `projects/{product-slug}/` (e.g. `projects/snapog/`).

| Concept | Description |
|---------|-------------|
| **Meta schedule** | `scheduleKind: meta` — worker picks the next workflow dynamically (discovery → evaluation → build → launch/pricing) |
| **TenantProduct** | Registered product with phase (`building`, `launching`, `growing`, …) |
| **PipelineIdea** | Ranked ideas from discovery cycles; GO/NO-GO gates bootstrap |
| **TenantCycleState** | Cycle counter, stuck detection, focus product |
| **Convergence rules** | Injected into agent memory; cycles 1–3 enforce brainstorm → evaluate → ship |

API routes:

- `GET /api/ops/portfolio` — dashboard data (products, pipeline, schedules, recent runs)
- `GET /api/ops/next-run` — meta-orchestrator preview (workflow + reason)
- `GET/POST /api/products/*` — product registry and pipeline actions

UI: `/ops` (tenant), meta schedule in `/settings`, GitHub token in `/admin/settings`.

Max **2 products** in Building/Launching simultaneously; Growing products (e.g. SnapOG) do not block new discovery.

## Auth model

| Role | Login | Scope |
|------|-------|-------|
| **Superadmin** | `/login` → Superadmin | All tenants; impersonation required for tenant UI |
| **Tenant user** | `/login` → Organization | Own tenant only |
| **Tenant admin** | owner / admin role | Settings, team, schedules |

Superadmins impersonating a tenant can access **Settings** and other admin routes.

## Tenant isolation

- **Database**: all tenant resources filtered by `tenantId`
- **Workspace**: agent file tools use `WORKSPACE_ROOT/projects/{tenant-slug}/`
- **LLM keys**: stored encrypted (`enc:v1:`) using `ENCRYPTION_KEY` or `JWT_SECRET`

## Environment variables

See `.env.example` (development) and `.env.production.example` (Docker/Dokploy).

**Keep in `.env` (infrastructure / secrets):**

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `REDIS_URL` | BullMQ queue |
| `JWT_SECRET` | Session cookies |
| `ENCRYPTION_KEY` | Encrypt stored API keys (falls back to JWT_SECRET) |
| `WORKSPACE_ROOT` | Base path for agent tools (Docker: `/app`) |
| `PORT` / `HOST` | Server bind |
| `CORS_ORIGIN` | Optional override; default uses **Platform settings → Public URL** |

**Configure in UI** (`/admin/settings`, superadmin): public URL, default LLM provider/model, TokenLab/OpenRouter/Custom keys, Resend email, **GitHub token** (for autonomous git/gh tools), rate limits, shell timeout, scheduler interval.

Legacy env vars (`TOKENLAB_API_KEY`, `PUBLIC_URL`, etc.) are imported into Platform settings on first boot if present.

## Local development

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed

npm run dev          # API
npm run worker       # Queue + scheduler
npm run dev:frontend # UI :5173
```

First visit: `http://localhost:5173/setup` → superadmin → `/admin` → create tenant.

## Production (Docker)

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production up -d --build
```

Services: `postgres`, `redis`, `api`, `worker`, `web`. Expose only `web`.

## Features (v2.1)

| Feature | Location |
|---------|----------|
| Platform templates | `/admin/templates` — edit global agents/skills/workflows (visual graph editor), reseed from `.claude/`, **sync to existing tenants** |
| Notifications | Settings → webhook / Slack / email on run complete/fail |
| Usage limits | Settings → monthly runs/cost/tokens caps |
| Password reset | `/forgot-password` → email link → `/reset-password` |
| CLI cycle | `scripts/platform/cycle.sh` — HTTP bridge for cron/systemd |
| Schedule run-now | Settings → Autonomous schedules → **Run now** |

## API overview

| Area | Prefix |
|------|--------|
| Auth | `/api/auth/*` |
| Admin | `/api/admin/*` |
| Agents, skills, workflows, runs | `/api/agents`, `/skills`, `/workflows`, `/runs` |
| Consensus | `/api/consensus` |
| Schedules | `/api/schedules` |
| Tenant LLM settings | `/api/tenant/settings/llm` |
| Notifications | `/api/tenant/settings/notifications` |
| Usage limits | `/api/tenant/settings/limits` |
| Platform templates | `/api/admin/templates/*` |
| Platform agent/skill create | `POST /api/admin/templates/agents`, `POST /api/admin/templates/skills` |
| Platform workflow templates | `GET/POST /api/admin/templates/workflows`, `GET/PUT/DELETE .../workflows/:id` (graph via PUT) |
| Template sync to tenants | `POST /api/admin/templates/sync-tenants`, `POST /api/admin/tenants/:id/sync-templates` |
| Password reset | `/api/auth/tenant/forgot-password`, `/reset-password` |

## Template sync (existing tenants)

Platform templates are **copied once** when a tenant is created. To push changes to tenants that already exist:

| Mode | Behavior |
|------|----------|
| **merge** (default) | Add platform skills/agents/workflows missing in the tenant |
| **update** | Same as merge, plus overwrite matching templates (prompts, workflow graph, skill links, **names**) |

Matching order: **`platformSourceId`** (stable platform template id) → fallback to **name**. Renaming a global template and running **update** renames tenant copies linked by id.

- **All tenants:** `/admin/templates` → **Sync all tenants**
- **Selected tenants:** `/admin/templates` → check tenants → **Sync selected**
- **One tenant:** `/admin` dashboard → choose Merge/Update → **Sync templates**

Tenant-only customizations (resources with names not on the platform) are never deleted.

## Production checklist

After pulling a new version:

```bash
docker compose --env-file .env.production pull   # or git pull on server
docker compose --env-file .env.production up -d --build api worker web
# Migrations run automatically when RUN_MIGRATIONS=true (api entrypoint)
```

Required env vars:

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` / `ENCRYPTION_KEY` | Auth + encryption for stored keys |
| `REDIS_URL` | Worker queue (required in production) |
| `DATABASE_URL` | Set automatically in Docker Compose |

Configure **Public URL**, LLM keys, and email in **Admin → Platform settings** (`/admin/settings`).

Optional legacy env import on first boot: `PUBLIC_URL`, `TOKENLAB_API_KEY`, `RESEND_API_KEY`, etc.

## What's still optional (v3)

- Stripe billing integration and paid plan tiers
- Deep E2E tests with Postgres + Redis test containers

## Related docs

- [`frontend/README.md`](../frontend/README.md) — UI routes
- [`docker/README.md`](../docker/README.md) — deployment
