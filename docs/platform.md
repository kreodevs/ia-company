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

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `REDIS_URL` | BullMQ queue |
| `JWT_SECRET` | Session cookies |
| `ENCRYPTION_KEY` | Encrypt tenant API keys (falls back to JWT_SECRET) |
| `WORKSPACE_ROOT` | Base path for agent tools |
| `EXECUTE_RATE_LIMIT_MAX` | Per-IP workflow execute limit/min |
| `USE_INLINE_EXECUTOR` | Skip Redis queue (dev fallback) |

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
| Platform templates | `/admin/templates` — edit global agents/skills/workflows (visual graph editor), reseed from `.claude/` |
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
| Platform workflow templates | `GET/POST /api/admin/templates/workflows`, `GET/PUT/DELETE .../workflows/:id` (graph via PUT) |
| Password reset | `/api/auth/tenant/forgot-password`, `/reset-password` |

## What's still optional (v3)

- Stripe billing integration and paid plan tiers
- Deep E2E tests with Postgres + Redis test containers

## Related docs

- [`frontend/README.md`](../frontend/README.md) — UI routes
- [`docker/README.md`](../docker/README.md) — deployment
