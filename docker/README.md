# Docker deployment (Dokploy)

Stack for production: **PostgreSQL + Redis + API + Worker + Web (nginx)**.

## Services

| Service | Image / build | Port | Role |
|---------|---------------|------|------|
| `postgres` | `postgres:16-alpine` | internal | Database |
| `redis` | `redis:7-alpine` | internal | BullMQ job queue |
| `api` | `docker/api/Dockerfile` | internal `:3001` | Node API + Prisma |
| `worker` | same as `api` | internal | Workflow executor + autonomous scheduler |
| `web` | `docker/web/Dockerfile` | `${WEB_PORT:-80}` | SPA + reverse proxy `/api` → api |

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

Set in Dokploy / `.env.production` for password reset and email run notifications:

| Variable | Example |
|----------|---------|
| `RESEND_API_KEY` | `re_...` from [resend.com](https://resend.com) |
| `EMAIL_FROM` | `Auto Company <noreply@yourdomain.com>` (verified domain) |
| `PUBLIC_URL` | `https://your-dokploy-domain.com` |

Without these, the API still runs; email features no-op with a log warning.

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
