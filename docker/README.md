# Docker deployment (Dokploy)

Stack for production: **PostgreSQL + Redis + API + Worker + Web (nginx)**.

## Services

| Service | Image / build | Port | Role |
|---------|---------------|------|------|
| `postgres` | `postgres:16-alpine` | internal | Database |
| `redis` | `redis:7-alpine` | internal | BullMQ job queue |
| `api` | `docker/api/Dockerfile` | internal `:3001` | Node API + Prisma (uses `npm run build:server`, not full monorepo build) |
| `worker` | same as `api` | internal | Workflow executor + autonomous scheduler |
| `web` | `docker/web/Dockerfile` | `${WEB_PORT:-80}` | SPA + reverse proxy `/api` → api |

The **web** image installs the `frontend` npm workspace using the **root** `package-lock.json` (there is no `frontend/package-lock.json`).

## Quick start (local)

```bash
cp .env.production.example .env.production
# Edit passwords and JWT_SECRET

docker compose --env-file .env.production up -d --build
```

Open `http://localhost` → `/setup` to create superadmin.

## Dokploy

1. **New Compose** → connect Git repo or paste `docker-compose.yml`.
2. **Environment** → copy variables from `.env.production.example`.
3. Set `PUBLIC_URL` to your Dokploy domain (HTTPS).
4. Set strong `POSTGRES_PASSWORD` and `JWT_SECRET`.
5. Deploy. Only expose service **`web`** (port 80).
6. First visit: `/setup` (superadmin) → `/admin` → create tenant + owner user.
7. Tenant users sign in at `/login` → tab **Organization**.

## Email (Resend)

Configure in **Admin → Platform settings** (`/admin/settings`): Resend API key + from address.

Without Resend configured, password reset and email notifications are skipped (webhook/Slack still work).

## Entrypoint (`docker/api/entrypoint.sh`)

- Waits for PostgreSQL
- `RUN_MIGRATIONS=true` → `prisma migrate deploy`
- `RUN_SEED=true` → platform templates from `.claude/` (no tenant)
- Starts `node dist/server/index.js`

The **worker** service reuses the API image but runs `node dist/worker/index.js` directly (no migrations).

## Volumes

- `postgres_data` — database persistence
- `redis_data` — queue persistence
- `workspace_data` → `/app/projects` — agent file tools workspace

## Health checks

- API: `GET /api/health`
- Web: nginx `/`
- Redis: `redis-cli ping`
