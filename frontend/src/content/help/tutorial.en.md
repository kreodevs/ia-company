# Auto-Company Platform guide

> **Auto-Company** is a multi-tenant platform with an **on-demand Office**: you commission work through a coordinator and a team of AI agents; they research, decide, implement, and document in real products under `projects/`. Automatic scheduling is **optional**.

---

## What you can do with the app

This is your **getting-started tutorial**. It reflects the current Office-first product model.

### In one sentence

Manage **products and opportunities** with specialized agents (CEO, CTO, product, code, growth…) sharing memory (*consensus*), working in per-product workspaces, launched **from the Office** when you decide.

### Main flow: the Office

1. Go to **`/office`** — tenant home after login.
2. Chat with the **coordinator** or pick a **quick service** (discovery, evaluation, build…).
3. Review the **team plan** (agents, estimated cost, scope) and click **Approve & run**.
4. Follow progress in **War room** (`/war-room/:productId`) live.
5. When done, the **job** appears under **`/office/encargos`** with final report and team documents.

> **No automatic cycles by default.** The operations plan starts in *on-demand* mode (0 rules). Enable presets under **Settings → Schedules** only if you want weekly discovery or other partial autopilot.

### If you are a superadmin (platform)

| Step | Where | Outcome |
|------|-------|---------|
| 1 | `/admin/settings` | Shared LLM (OpenRouter or TokenLab), email, rate limits |
| 2 | `/admin` | Create **tenants** and clone global templates |
| 3 | `/admin/templates` | Edit master **agents, skills, workflows** |
| 4 | Header selector | **Impersonate** a tenant and try the Office |

### If you are a tenant user

| Step | Where | Outcome |
|------|-------|---------|
| 1 | `/office` | Commission work via coordinator |
| 2 | `/products` | Register products (GitHub or new), pipeline, focus |
| 3 | `/war-room/:id` | Live tactical view + coordinator chat |
| 4 | `/office/encargos` | Job history and reports |
| 5 | `/debug/runs` | Technical logs, tokens, cost |
| 6 | `/settings` | Integrations, OpenCode, limits, schedules |

### Express tutorial (15 minutes)

1. **Log in** with your organization slug at `/login`.
2. Open **Office** → ask the coordinator *“Explore 3 micro-SaaS ideas”* or use the discovery service.
3. Approve the plan → watch the run in **War room**.
4. Go to **Products** → register an existing repo (GitHub URL + optional *product-intake*) or create a new one.
5. On the product: **Consensus**, **Code**, and **OpenCode** (agent/model/path per product).
6. Review the finished job under **My jobs**.
7. (Optional) **Settings → Schedules** → *Discovery only* preset for Saturday autopilot.

### What each main area does

| Area | Purpose |
|------|---------|
| **Office** | Conversational coordinator, quick services, ROI, monthly spend |
| **My jobs** | Commissioned work inbox with final report |
| **Products** | Portfolio, idea pipeline, GitHub registration, focus |
| **War room** | Per-product tactical table: live agents, docs, coordinator |
| **Debug office** | Runs, consensus, ops, decisions, AI catalog (workflows/agents/skills) |
| **Settings** | Tenant LLM, global OpenCode, GitHub, notifications, limits, schedules |
| **Help** | This guide |

### Usage modes

| Mode | When | How |
|------|------|-----|
| **On demand** (default) | Daily use, full control | Office → approve plan → war room |
| **Fixed schedule** | Weekly discovery, Monday review | Settings → Schedules → preset or rule |
| **Technical debug** | Tune agents, SSE logs | `/debug/*` |

> **Tip:** Complete one manual Office job before enabling schedules.

---

## Table of contents

1. [What you can do with the app](#what-you-can-do-with-the-app)
2. [Getting started](#getting-started)
3. [Roles and access](#roles-and-access)
4. [Application map](#application-map)
5. [The on-demand Office](#the-on-demand-office)
6. [Products and portfolio](#products-and-portfolio)
7. [War room and jobs](#war-room-and-jobs)
8. [Agents, skills, and workflows](#agents-skills-and-workflows)
9. [Runs](#runs)
10. [Consensus and memory](#consensus-and-memory)
11. [Operations and scheduling](#operations-and-scheduling)
12. [Tenant settings](#tenant-settings)
13. [OpenCode and integrations](#opencode-and-integrations)
14. [Platform administration](#platform-administration)
15. [Deploy and worker](#deploy-and-worker)
16. [Troubleshooting](#troubleshooting)

---

## Getting started

### Local install (development)

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed

# Terminal 1 — API
npm run dev

# Terminal 2 — Worker (queue + optional scheduler)
npm run worker

# Terminal 3 — Frontend
npm run dev:frontend
```

Open **http://localhost:5173**. After tenant login you land on **`/office`**.

### First UI steps

| Step | Route | Action |
|------|-------|--------|
| 1 | `/setup` | Create **superadmin** (first time only) |
| 2 | `/admin` | Create tenant and clone templates |
| 3 | Header | Impersonate tenant |
| 4 | `/settings?tab=integrations` | **GitHub** token (private repos + intake) |
| 5 | `/office` | First coordinator job |

---

## Roles and access

### Superadmin (platform)

- Access `/admin`, global templates, platform settings.
- **Impersonate** tenants from the header selector.
- Without impersonation, tenant routes redirect to `/admin`.

### Tenant user

- Login: **slug** + email + password.
- Default landing: **`/office`**.

### Tenant roles

| Role | Permissions |
|------|-------------|
| **owner / admin** | Settings, team, limits, schedules |
| **member** | Office, products, war room, debug (read/execute) |

---

## Application map

### Office (human flow)

| Route | Description |
|-------|-------------|
| `/` · `/office` | Coordinator, services, activity, ROI |
| `/office/encargos` | Job inbox |
| `/office/encargos/:runId` | Final report + team documents |
| `/products` | Portfolio, pipeline, add product |
| `/war-room/:productId` | Per-product war room |
| `/debug/products/:id/consensus` | Product memory (debug) |
| `/products/:id/code` | Workspace + per-product OpenCode |
| `/settings` | Tenant configuration |
| `/help` | Help center |

### Debug office (technical)

| Route | Description |
|-------|-------------|
| `/debug/runs` · `/debug/runs/:id` | Runs and SSE logs |
| `/debug/consensus` | Tenant consensus |
| `/debug/ops` | KPIs and active schedules |
| `/debug/decisions` | Go/no-go proposals |
| `/office/workflows` · `/office/workflows/:id` | React Flow visual editor (Office) |
| `/debug/agents` · `/debug/skills` | AI catalog |
| `/debug/team` | Tenant users (admin) |

### Platform (superadmin)

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard and tenants |
| `/admin/settings` | LLM, email, rate limits |
| `/admin/templates` | Global templates |

---

## The on-demand Office

### Coordinator

Chat at **`/office`** with tenant context and optional **product scope**. Proposes:

- Agent team and work order
- Estimated cost and monthly spend bar in sidebar
- Direct link to war room on execute

### Quick services

Predefined shortcuts (discovery, evaluation, etc.) that skip small talk and produce an approvable plan.

### Notifications

Header bell → alert when a job completes or fails. Mobile panel respects safe area.

### Monthly spend

Sidebar widget with progress vs tenant limits.

---

## Products and portfolio

Each product lives in **`projects/{slug}/`** with phase, revenue, focus, and its own workspace.

### Add product

At **`/products` → Add product**:

| Mode | Use |
|------|-----|
| **Register existing** | GitHub URL, optional clone, `product-intake` workflow for profile |
| **Create new** | Empty bootstrap in `projects/{slug}/` |

**Requirement:** GitHub token under **Settings → Integrations** for private repos and API enrichment.

### Pipeline and decisions

- Discovery ideas → pipeline on Products
- Manual **GO / NO-GO** or evaluation workflow
- Agent proposals → **`/debug/decisions`**

### Focus

One **focused** product prioritizes development and product-scoped jobs.

### Product profile

After intake: `product-profile.json`, metadata, and product consensus feed agent prompts on focused runs.

---

## War room and jobs

### War room (`/war-room/:productId`)

- Tactical view while a workflow runs
- Launcher: workflows and single agents per product
- Documents under `docs/{role}/`

### Jobs (`/office/encargos`)

- List of Office-commissioned work
- Detail: full-width **final report** + per-agent document sidebar
- Rich markdown (GFM, Mermaid, charts)

### Run ↔ job relationship

During execution → war room. When complete → human job with readable report (light/dark themes).

---

## Agents, skills, and workflows

### Agents (`/debug/agents`)

Expert persona: system prompt, model, temperature, linked skills.

### Skills (`/debug/skills`)

Reusable knowledge blocks injected into prompts.

### Workflows (`/office/workflows`)

Visual graph: agent order, shared memory, manual execute from editor.

### Standard workflows (templates)

| Name | Purpose |
|------|---------|
| `opportunity-discovery` | Ideas → pipeline |
| `new-product-evaluation` | Evaluation → GO/NO-GO |
| `product-intake` | Product profile from GitHub |
| `feature-development` | Workspace implementation |
| `product-launch` | Launch |
| `pricing-and-monetization` | Pricing |
| `weekly-review` | Operational review |

---

## Runs

Each run (`/debug/runs/:id`) includes:

- Status: `PENDING` → `RUNNING` → `COMPLETED` / `FAILED` / `CANCELLED`
- **Shared memory** across steps
- **SSE logs** in real time
- Tokens and estimated cost

### Agent tools

| Tool | Function |
|------|---------|
| `read_file` / `write_file` / `list_dir` | Product workspace files |
| `shell` | Commands (configurable timeout) |
| `git_*` | Git in project |
| `npm_run` | npm scripts |
| `wrangler_deploy` | Cloudflare deploy |

---

## Consensus and memory

### Tenant consensus (`/debug/consensus`)

Shared markdown: decisions, company phase, human **Next Action**.

### Product consensus (`/debug/products/:id/consensus`)

Technical memory, revisions, and agent reports — **Debug office** only. In the human office use **Jobs (Encargos)** for deliverables.

### Structured fields (shared memory)

| Field | Effect |
|-------|--------|
| `topIdeas[]` | Pipeline ideas |
| `goNoGo` | GO / NO-GO |
| `productSlug` | Portfolio registration |
| `revenueUsd` | *Growing* phase |

---

## Operations and scheduling

### Ops view (`/debug/ops`)

KPIs, phase, portfolio summary, active schedules, 7-day preview.

### Operations plan (Settings → Schedules)

| Preset | Rules |
|--------|-------|
| **On demand** (default) | 0 — control from Office |
| **Discovery only** | Weekly Saturday discovery when pipeline empty |
| **Light exploration** | Discovery + evaluation + Monday review |

**Fixed** workflow rules; dynamic orchestrator (meta) remains an advanced option when adding rules manually — **not the recommended flow**.

### Worker

The **`worker`** container processes the queue and evaluates schedules every ~60 s. Without it, schedules do not fire (Office still works).

---

## Tenant settings

Tabs at **`/settings`**:

| Tab | Content |
|-----|---------|
| **General** | Discovery interests |
| **LLM** | Model override, cost cap/run (provider via superadmin) |
| **OpenCode** | URL, credentials, *enabled* **globally** |
| **Integrations** | GitHub token, tenant SMTP for agent email |
| **MCP servers** | Register stdio MCP servers, agent grants, tool sync |
| **Notifications** | Webhook, Slack, email, in-app |
| **Limits** | Monthly runs/tokens/cost |
| **Schedules** | Operations plan and rules |

---

## OpenCode and integrations

### GitHub (tenant)

**Settings → Integrations** — PAT with `repo` scope for clone, README, languages, and `product-intake`.

**SMTP (same tab)** — Host, credentials, allowlist, and daily cap so agents can use the `send_email` tool. Only allowlisted addresses receive mail; every send is audited.

**Settings → MCP servers** — Register stdio MCP commands, sync tools, and grant specific agents. Read-only mode blocks mutating tool names by default; each server has a per-run call budget.

### OpenCode

| Level | What you configure |
|-------|-------------------|
| **Tenant** | Base URL, username, password, enable/disable, auto-approve |
| **Product** (`/products/:id/code`) | Default agent, model, project path |

Delegation uses **per-product** config when implementing code.

---

## Platform administration

### Create tenant

Name, slug, owner, **clone templates**.

### Templates (`/admin/templates`)

Master agents, skills, workflows. **Sync to tenants** to propagate changes.

### Platform settings

| Setting | Use |
|---------|-----|
| LLM provider + key | OpenRouter or TokenLab (one active) |
| Public URL | Email and CORS |
| Resend | Transactional email |
| Rate limits | Auth and execute |
| Scheduler tick | Worker frequency |

> Platform GitHub token (if any) is separate from the **per-tenant** token in Integrations.

---

## Deploy and worker

Docker Compose stack (Dokploy-ready): `postgres`, `redis`, `api`, `worker`, `web`.

Checklist:

- [x] Migrations on deploy — automatic via api entrypoint (`RUN_MIGRATIONS` default true)
- [ ] `worker` healthy (schedules + queue)
- [ ] LLM configured at `/admin/settings`
- [ ] Tenant GitHub token if using private intake
- [ ] Operations plan: *on demand* unless you want partial autopilot

---

## Troubleshooting

### Cannot clone a private repo

- GitHub token under tenant **Settings → Integrations**
- Test connection on the same tab

### Scheduling never runs

- Is **worker** running?
- Any **enabled** rules under Schedules? (default: none)
- Monthly limit reached?

### Runs fail on LLM

- Superadmin → `/admin/settings`: active provider + API key
- Check `maxCostUsdPerRun` under Settings → LLM

### OpenCode does not delegate

- OpenCode enabled under Settings → OpenCode (global)
- Agent/model/path set on **product Code** page

### Job markdown low contrast

- Use **Stripe HDS Light**, **Paperclip Warm**, or **Slash** theme; reports use `--office-*` tokens

### Stuck on same Next Action

**Convergence** engine pivots after repeated cycles — edit consensus manually if needed.

---

> **Next step:** impersonate your tenant → **`/office`** → commission discovery → follow in **War room** → read the report under **My jobs**.
