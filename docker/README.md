# Docker deployment (Dokploy)

Stack for production: **PostgreSQL + Redis + API + Worker + Web (nginx)**.

## Services

| Service | Image / build | Port | Role |
|---------|---------------|------|------|
| `postgres` | `public.ecr.aws/docker/library/postgres:16-alpine` | internal | Database |
| `redis` | `public.ecr.aws/docker/library/redis:7-alpine` | internal | BullMQ job queue |
| `api` | `docker/api/Dockerfile` | internal `:3001` | Node API + Prisma (uses `npm run build:server`, not full monorepo build) |
| `worker` | same as `api` | internal | Workflow executor + autonomous scheduler |
| `web` | `docker/web/Dockerfile` | internal `:80` (Dokploy domain) | SPA + reverse proxy `/api` → api |

The **web** image installs the `frontend` npm workspace using the **root** `package-lock.json` (there is no `frontend/package-lock.json`).

## Quick start (local)

```bash
cp .env.production.example .env.production
# Edit passwords and JWT_SECRET

docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env.production up -d --build
```

Open `http://localhost:8080` → `/setup` to create superadmin.

## Dokploy

1. **New Compose** → connect Git repo or paste `docker-compose.yml`.
2. **Environment** → copy variables from `.env.production.example`.
3. Set strong `POSTGRES_PASSWORD` and `JWT_SECRET`.
4. Deploy. **Do not** publish host ports — add a **Domain** in Dokploy → service `web`, port `80`, path `/`.
5. First visit: `/setup` (superadmin) → `/admin` → create tenant + owner user.
6. Tenant users sign in at `/login` → tab **Organization**.

## Troubleshooting deploy

### `TLS handshake timeout` pulling `node` / `nginx` / `postgres`

Some Dokploy hosts cannot reach Docker Hub reliably. This repo uses the **AWS ECR Public** mirror of Docker Official Images (`public.ecr.aws/docker/library/...`) in `docker-compose.yml` and Dockerfiles.

If pulls still fail: retry the deploy, or on the server run `docker pull public.ecr.aws/docker/library/node:20-alpine` once, then redeploy.

## Email (Resend)

Configure in **Admin → Platform settings** (`/admin/settings`): Resend API key + from address.

Without Resend configured, password reset and email notifications are skipped (webhook/Slack still work).

## Entrypoint (`docker/api/entrypoint.sh`)

- Waits for PostgreSQL
- If a custom command is passed (worker service), runs it and skips migrations/API boot
- Otherwise (`api` service):
  - `RUN_MIGRATIONS` defaults to **true** → `prisma migrate deploy` then idempotent `prisma/scripts/ensure-tenant-smtp-mcp.sql` (safe if partially applied)
  - Set `RUN_MIGRATIONS=false` only to skip (e.g. external DBA runs migrations)
  - `RUN_SEED=true` → platform templates from `claude/` (no tenant)
  - Starts `node dist/src/server/index.js`

The **worker** service reuses the API image with `command: ["node", "dist/src/worker/index.js"]`.

## Volumes

- `postgres_data` — database persistence
- `redis_data` — queue persistence
- `workspace_data` → `/app/projects` — agent workspace (empty volume; `pack-seed/projects/` copied on first API boot for vertical packs like SnapOG)

## Health checks

- API: `GET /api/health`
- Web: nginx `/`
- Redis: `redis-cli ping`
