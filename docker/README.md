# Docker deployment (Dokploy)

Stack for production: **PostgreSQL + API (Fastify) + Web (nginx)**.

## Services

| Service | Image / build | Port | Role |
|---------|---------------|------|------|
| `postgres` | `postgres:16-alpine` | internal | Database |
| `api` | `docker/api/Dockerfile` | internal `:3001` | Node API + Prisma |
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

## Entrypoint (`docker/api/entrypoint.sh`)

- Waits for PostgreSQL
- `RUN_MIGRATIONS=true` → `prisma db push`
- `RUN_SEED=true` → platform templates from `.claude/` (no tenant)
- Starts `node dist/server/index.js`

## Volumes

- `postgres_data` — database persistence
- `workspace_data` → `/app/projects` — agent file tools workspace

## Health checks

- API: `GET /api/health`
- Web: nginx `/`
