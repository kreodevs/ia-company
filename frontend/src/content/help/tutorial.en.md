# Auto-Company Platform Complete Guide

> **Auto-Company** is a multi-tenant platform for orchestrating AI agent teams that research, decide, implement, and launch products autonomously — with shared memory (*consensus*), visual workflows, and a scheduler that runs cycles without human intervention.

---

## Table of contents

1. [Getting started](#getting-started)
2. [Roles and access](#roles-and-access)
3. [Application map](#application-map)
4. [Agents and skills](#agents-and-skills)
5. [Visual workflows](#visual-workflows)
6. [Execution runs](#execution-runs)
7. [Consensus — shared memory](#consensus--shared-memory)
8. [Multi-product operations (Ops)](#multi-product-operations-ops)
9. [Autonomous mode](#autonomous-mode)
10. [Tenant configuration](#tenant-configuration)
11. [Platform administration](#platform-administration)
12. [Products in `projects/`](#products-in-projects)
13. [CLI and external automation](#cli-and-external-automation)
14. [Production deployment](#production-deployment)
15. [Troubleshooting](#troubleshooting)

---

## Getting started

### Local installation (development)

```bash
# From the repository root
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed

# Terminal 1 — API
npm run dev

# Terminal 2 — Worker (queue + autonomous scheduler)
npm run worker

# Terminal 3 — Frontend
npm run dev:frontend
```

Open **http://localhost:5173**.

### First startup in the UI

| Step | Route | Action |
|------|------|--------|
| 1 | `/setup` | Create the platform **superadmin** (first time only) |
| 2 | `/admin` | Create a **tenant** (organization) and clone templates |
| 3 | Impersonation | Select the tenant in the header |
| 4 | `/settings` | Enable **meta schedule** and tenant limits |
| 5 | `/ops` | View portfolio and launch the first autonomous cycle |

> **Tip:** If a superadmin already exists, go directly to `/login`.

---

## Roles and access

### Superadmin (platform)

- Access to `/admin`, global templates, and platform settings.
- Can **impersonate** any tenant from the header selector.
- Without active impersonation, tenant routes redirect to `/admin`.

### Organization user (tenant)

- Login with **tenant slug** + email + password.
- Direct access to workflows, runs, consensus, ops, and settings (depending on role).

### Roles within the tenant

| Role | Permissions |
|-----|----------|
| **owner / admin** | Settings, schedules, team, usage limits |
| **member** | Workflows, runs, consensus, ops (read/execute) |

---

## Application map

| Route | Description |
|------|-------------|
| `/workflows` | List and create workflows |
| `/workflows/:id` | Visual editor (React Flow) — connect agents and execute |
| `/agents` | Agent CRUD (persona, model, temperature, skills) |
| `/skills` | Skill CRUD (reusable prompts) |
| `/runs` | Execution history with cost and tokens |
| `/runs/:id` | Live logs (SSE), shared memory, cancel run |
| `/consensus` | Shared memory document between cycles |
| `/ops` | Multi-product dashboard: portfolio, pipeline, next cycle |
| `/settings` | Tenant preferences (optional model override, limits, schedules) — shared LLM via superadmin |
| `/team` | Tenant users (admin) |
| `/admin` | Superadmin dashboard |
| `/admin/templates` | Global agent/skill/workflow templates |
| `/admin/settings` | Shared LLM provider (OpenRouter **or** TokenLab), keys, email, GitHub, rate limits |
| `/help` | This help section |

---

## Agents and skills

### Agents

Each agent represents an **expert persona** (CEO, CTO, QA, etc.):

- **System prompt** — base role instructions.
- **Provider / model** — TokenLab, OpenRouter, or custom (OpenAI-compatible).
- **Temperature** — creativity vs. determinism.
- **Linked skills** — additional knowledge injected into the prompt.

### Skills

Specialized knowledge blocks (research, devops, pricing, etc.). Assigned to one or more agents and included automatically when executing a workflow step.

> **Best practice:** Keep skills atomic and reusable; avoid duplicating prompts across agents.

---

## Visual workflows

### Create and edit

1. Go to **Workflows → New workflow** or edit an existing one.
2. Drag **agent nodes** onto the canvas.
3. Connect nodes with **edges** (data/memory flow).
4. Save the graph.

### Run manually

In the editor:

- **Execute** — launches the workflow.
- By default loads the tenant **consensus** as initial memory.
- On completion, can sync results back to consensus.

### Standard workflows (templates)

| Name | Purpose |
|--------|-----------|
| `opportunity-discovery` | Idea brainstorm → pipeline |
| `new-product-evaluation` | Evaluate idea → GO / NO-GO |
| `feature-development` | Implement in `projects/{slug}/` |
| `product-launch` | Launch and growth |
| `pricing-and-monetization` | Pricing and monetization |

---

## Execution runs

Each execution creates an **ExecutionRun** with:

- Status: `PENDING` → `RUNNING` → `COMPLETED` / `FAILED` / `CANCELLED`
- **Shared memory** — JSON accumulated between steps
- **Logs** — per agent and step, with tokens and estimated cost
- **SSE stream** — real-time logs at `/runs/:id`

### Tools available to agents

During a run, agents can invoke tools in the workspace:

| Tool | Function |
|------|---------|
| `read_file` / `write_file` / `list_dir` | Files in workspace |
| `shell` | Shell command (configurable timeout) |
| `git_status` / `git_commit` | Git in the project |
| `npm_run` | npm scripts |
| `wrangler_deploy` | Deploy Cloudflare Workers |

> A product workspace is `projects/{product-slug}/`. Without a focal product, uses `projects/{tenant-slug}/`.

---

## Consensus — shared memory

Equivalent to `memories/consensus.md` in the original Auto-Company.

### What it stores

- **Markdown document** — decisions, context, history.
- **Next Action** — focus of the next cycle.
- **Company phase** — `exploring`, `validating`, `building`, `launching`, `growing`.

### Typical cycle

```
Run workflow
  → Load consensus into initial memory
  → Agents collaborate and update memory
  → On finish: persist consensus + cycle summary
  → Scheduler / meta-orchestrator repeats
```

### Structured fields (JSON memory)

Agents can write to shared memory:

| Field | Effect |
|-------|--------|
| `topIdeas[]` | Adds ideas to the pipeline |
| `goNoGo` | `GO` / `NO-GO` → bootstrap or discard |
| `productSlug`, `productName` | Registers product in portfolio |
| `revenueUsd` | Marks product as *growing* |

---

## Multi-product operations (Ops)

The **`/ops`** view centralizes the state of the “autonomous company”:

### Main panel

- **Company phase** and cycle number
- **Products** in building / growing
- **Pipeline** of ideas pending evaluation
- **Revenue** recorded per product
- **Next run preview** — which workflow the meta-orchestrator will choose

### Actions

- **Run meta cycle now** — triggers an immediate cycle
- **Focus** — mark priority product
- **GO / NO-GO** — manually decide pipeline ideas

### Product limit

Maximum **2 products** simultaneously in *Building* or *Launching* phase. Products in *Growing* (e.g. SnapOG) do not block discovery of new ideas.

---

## Autonomous mode

### Meta schedule (recommended)

The **meta schedule** (`scheduleKind: meta`) does not point to a fixed workflow. On each tick the **meta-orchestrator** decides:

```
Pending idea?           → new-product-evaluation
Product building?       → feature-development / product-launch
Only growing?           → pricing / launch alternated
Empty pipeline?         → opportunity-discovery
```

### Enable autonomy

1. **Settings → Enable meta schedule** (or created when registering tenant)
2. Verify the **worker** is running (`npm run worker` or Docker container)
3. Default interval: **1800 s** (30 min) — editable in Settings
4. Optional: **GitHub** token in Admin → Platform Settings for autonomous commits

### Internal scheduler

The worker checks schedules every **60 s** (`schedulerTickMs` in platform settings). When `nextRunAt` expires and the schedule is `enabled`, it enqueues execution.

### Fixed schedules (optional)

Besides the meta schedule you can create schedules that run **a specific workflow** on a fixed interval — useful for repetitive tasks outside the orchestrator.

---

## Tenant configuration

In **`/settings`** (tenant admin):

### LLM

- **Provider and API key:** superadmin only at `/admin/settings` (shared by all tenants)
- Choose **OpenRouter or TokenLab** (one active provider, not both at once)
- Tenant `/settings`: optional model override and **max cost per run**

### Notifications

- Webhook, Slack, email (Resend) when runs complete or fail

### Usage limits

- Monthly runs, tokens, and cost — the scheduler respects these limits

### Schedules

- Meta schedule (autonomous company)
- Fixed workflow schedules

---

## Platform administration

**Superadmin** only at `/admin`:

### Create tenant

- Name, slug, optional owner
- **Clone templates** — copies global agents, skills, and workflows

### Templates (`/admin/templates`)

- Edit master personas and workflows
- **Reseed** — regenerate from seed
- **Sync to tenants** — bulk merge or update

### Platform settings (`/admin/settings`)

| Setting | Use |
|---------|-----|
| Public URL | Links in emails and CORS |
| LLM provider + key | Shared by all tenants (OpenRouter or TokenLab) |
| Resend | Transactional emails |
| GitHub token | `git_commit` / repos tools |
| Rate limits | Auth and execute per minute |
| Shell timeout | Maximum command time |
| Scheduler tick | Worker loop frequency |

---

## Products in `projects/`

Each product lives in its folder:

```
projects/
├── snapog/          # Example: OG images API (Cloudflare Worker)
└── my-saas/         # Product bootstrapped by a GO cycle
```

When approving a product (`GO`), the platform:

1. Creates the `TenantProduct` record
2. Bootstraps the workspace (`README`, base structure)
3. Focuses development runs on `projects/{slug}/`

### SnapOG (included product)

- `/og` API — Open Graph image generation
- Registration at `/register`, dashboard at `/dashboard`
- Stripe checkout at `/checkout?tier=pro` (if keys configured)

---

## CLI and external automation

### One cycle from terminal

```bash
export API_URL=https://your-domain.com/api

# Meta (autonomous — picks workflow dynamically)
./scripts/platform/cycle.sh YOUR-SLUG owner@email.com 'password'

# Fixed workflow by UUID
./scripts/platform/cycle.sh YOUR-SLUG owner@email.com 'password' <workflow-id>
```

### Relevant API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workflows/:id/execute` | POST | Execute workflow |
| `/api/schedules` | GET/POST | Tenant schedules |
| `/api/schedules/:id/run-now` | POST | Manual trigger |
| `/api/ops/portfolio` | GET | Multi-product state |
| `/api/ops/next-run` | GET | Meta-orchestrator preview |
| `/api/consensus` | GET/PUT | Shared memory |
| `/api/products` | GET | Product portfolio |

---

## Production deployment

Docker Compose stack (Dokploy-ready):

| Service | Function |
|----------|----------|
| `postgres` | Database |
| `redis` | BullMQ queue |
| `api` | Fastify + migrations |
| `worker` | Processor + **autonomous scheduler** |
| `web` | Static frontend (nginx) |

Post-deploy checklist:

- [ ] `RUN_MIGRATIONS=true` on first deploy
- [ ] `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, LLM keys variables
- [ ] **worker** container healthy and running
- [ ] Meta schedule **enabled** on tenant
- [ ] Platform settings → correct Public URL

---

## Troubleshooting

### Scheduler does not execute anything

- Is the **worker** running? (API alone is not enough)
- Is the schedule **enabled** and `nextRunAt` in the past?
- Was the **monthly limit** for runs/cost reached?

### Runs fail due to LLM

- Superadmin → `/admin/settings`: choose **OpenRouter or TokenLab** and set the active provider's API key
- Verify tenant `maxCostUsdPerRun` in `/settings`

### Agents do not commit / deploy

- Configure **GitHub token** in platform settings
- Verify the run uses workspace `projects/{slug}/`

### 404 in production after login

- The `web` container must pass healthcheck (Traefik excludes unhealthy)
- SPA routes: nginx must serve `index.html` for frontend routes

### Stuck on the same Next Action

The **convergence** engine detects repetition and forces a pivot in consensus after 2 identical cycles.

---

## Summary: is it autonomous?

| Component | Automatic? |
|------------|--------------|
| Workflow selection | ✅ Meta-orchestrator |
| Memory between cycles | ✅ Consensus |
| Periodic execution | ✅ Worker + meta schedule |
| Code implementation | ✅ Workspace tools (with LLM + keys) |
| Production deploy | ⚙️ With `wrangler_deploy` + credentials |
| Initial human setup | ❌ Once: keys, tenant, enable schedule |

---

> **Recommended next step:** impersonate your tenant → **Settings → Enable meta schedule** → **Ops → Run meta cycle now** → watch the run in **Runs**.

Questions? Edit consensus manually at `/consensus` to steer the focus of the next cycle.
