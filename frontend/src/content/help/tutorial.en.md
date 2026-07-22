# Auto-Company Platform Complete Guide

> **Auto-Company** is a multi-tenant platform for orchestrating AI agent teams that research, decide, implement, and launch products autonomously — with shared memory (*consensus*), visual workflows, and a scheduler that runs cycles without human intervention.

---

## What you can do with the app

This section is your **getting-started tutorial**. It summarizes what Auto-Company is for and which flows you can run from the UI.

### In one sentence

Orchestrate an **AI agent team** (research, product, code, QA, growth…) that works in sequence, shares memory, and can run **on demand** or in **autonomous mode** to build and evolve products under `projects/`.

### If you are a superadmin (platform)

| Step | Where | What you get |
|------|-------|--------------|
| 1 | `/admin/settings` | Configure the **shared LLM** (OpenRouter or TokenLab) plus email/GitHub |
| 2 | `/admin` | Create **tenants** and clone global templates |
| 3 | `/admin/templates` | Edit master **agents, skills, and workflows** |
| 4 | Impersonate tenant | Test the organization experience |

### If you are an organization user (tenant)

| Step | Where | What you get |
|------|-------|--------------|
| 1 | `/workflows` | Browse pipelines and open the **visual editor** |
| 2 | `/workflows/:id` | Connect agents, save, and **execute** a workflow |
| 3 | `/runs` | Track executions, tokens, cost, and live logs |
| 4 | `/consensus` | Read and edit **shared memory** between cycles |
| 5 | `/ops` | View the **multi-product portfolio** and launch meta cycles |
| 6 | `/settings` | Enable **meta schedule**, limits, and notifications |

### Express tutorial (15 minutes)

1. **Sign in** with your organization slug at `/login`.
2. Open **Workflows** → pick a template → **Open editor**.
3. Click **Execute workflow** (uses consensus as context when enabled).
4. Go to **Runs** → open the run → watch SSE logs and shared memory.
5. Open **Consensus** → review team decisions and edit the human *Next Action* to steer the next cycle.
6. In **Ops**, review portfolio products and the next scheduled cycle.
7. (Admin) In **Settings**, enable the **meta schedule** for continuous autonomy.

### What each main area does

- **Agents** — AI personas: prompt, model, temperature, and assigned skills.
- **Skills** — Reusable knowledge blocks (SEO, devops, pricing…).
- **Workflows** — Visual graph: who acts after whom and with which memory.
- **Runs** — A single execution with cost, tools (shell, git, npm…), and traceability.
- **Consensus** — Living document (equivalent to `memories/consensus.md`) with phase, decisions, and next step.
- **Ops** — **Multi-product** view: pipeline, schedules, and convergence.
- **Help** — This guide; use the left menu to jump between sections.

### Usage modes

| Mode | When to use | How |
|------|-------------|-----|
| **Manual** | Test a flow, debug an agent | Execute workflow from the editor |
| **Scheduled** | Repeat a fixed workflow | Schedule in `/settings` |
| **Autonomous** | 24/7 multi-product AI company | Meta schedule + server worker |

> **Tip:** Always start in manual mode until a run completes successfully; then enable schedules.

---

## Table of contents

1. [What you can do with the app](#what-you-can-do-with-the-app)
2. [Getting started](#getting-started)
3. [Roles and access](#roles-and-access)
4. [Application map](#application-map)
5. [Agents and skills](#agents-and-skills)
6. [Visual workflows](#visual-workflows)
7. [Execution runs](#execution-runs)
8. [Consensus — shared memory](#consensus--shared-memory)
9. [Multi-product operations (Ops)](#multi-product-operations-ops)
10. [Autonomous mode](#autonomous-mode)
11. [Tenant configuration](#tenant-configuration)
12. [Platform administration](#platform-administration)
13. [Products in `projects/`](#products-in-projects)
14. [CLI and external automation](#cli-and-external-automation)
15. [Production deployment](#production-deployment)
16. [Troubleshooting](#troubleshooting)

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
