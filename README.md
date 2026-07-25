<div align="center">

# Auto Company Platform

**Plataforma multi-tenant para orquestar una empresa de agentes IA** — Office, workflows visuales, consenso en PostgreSQL y ejecución bajo demanda o programada.

Desarrollado y mantenido por **[Kreo Devs](https://github.com/kreodevs)** · [`ia-company`](https://github.com/kreodevs/ia-company) <a href="README-ZH.md"><img alt="[中文说明]" src="https://img.shields.io/badge/%5B%E4%B8%AD%E6%96%87%E8%AF%B4%E6%98%8E%5D-2f3640.svg" /></a>

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](#quick-start)
[![React](https://img.shields.io/badge/UI-React-61DAFB?logo=react&logoColor=black)](#architecture)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](#architecture)
[![Redis](https://img.shields.io/badge/Queue-Redis-BullMQ-DC382D?logo=redis&logoColor=white)](#architecture)
[![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)](#production)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)

</div>

---

## About this project

**Auto Company Platform** es la evolución del concepto *Auto Company* hacia una aplicación web **self-hosted** y **multi-tenant**. En lugar de un loop bash 24/7 con un único `consensus.md`, aquí cada organización tiene su propio tenant, sus agentes, sus workflows y su memoria de consenso en base de datos.

El flujo principal es **Office-first**:

1. Hablas con el **coordinador** en `/office` y defines el encargo.
2. Apruebas el brief (equipo, presupuesto, alcance).
3. El **worker** ejecuta el workflow contra proveedores LLM (OpenRouter, OpenCode, etc.).
4. Opcionalmente, **reglas fijas** en Settings disparan workflows en intervalo o cron.

La plataforma conserva el ADN del proyecto original: **14 agentes con personas de expertos reales**, **30+ skills** reutilizables y **workflows de convergencia** (descubrir → evaluar → construir → crecer), pero con control humano explícito, aislamiento por tenant y observabilidad en la UI.

---

## What you get

| Area | Capabilities |
|------|----------------|
| **Office** | Chat con coordinador, síntesis de brief, aprobación antes de ejecutar |
| **Workflows** | Editor visual (React Flow) en `/office/workflows` |
| **Agents & skills** | CRUD por tenant; seed desde `.claude/agents/` y `.claude/skills/` |
| **Ops** | Portfolio de productos, pipeline de ideas, decisiones GO/NO-GO |
| **Orchestration** | Reglas programadas por workflow (sin meta-orquestador 24/7) |
| **Integrations** | SMTP saliente, servidores MCP, OpenCode bridge, tokens GitHub |
| **Admin** | Superadmin, impersonación, límites de coste, auditoría |

Documentación detallada: [`docs/platform.md`](docs/platform.md) · [`CLAUDE.md`](CLAUDE.md) (misión, guardrails, equipo).

---

## Stack

| Layer | Technology |
|-------|------------|
| API | Node.js · Fastify · Prisma · PostgreSQL |
| Queue | Redis · BullMQ worker + scheduler |
| UI | React · React Flow · Tailwind v4 · Kreo design tokens |
| Deploy | Docker Compose (Dokploy-ready) |

---

## Quick start

```bash
# 1. Environment
cp .env.example .env
# DATABASE_URL, JWT_SECRET, REDIS_URL, LLM keys

# 2. Database + templates
npm install
npx prisma migrate dev
npm run db:seed

# 3. API, worker, frontend (three terminals)
npm run dev          # API :3001
npm run worker       # BullMQ + scheduler
npm run dev:frontend # UI :5173
```

**First visit:** `/setup` → superadmin → `/admin` → crear tenant → impersonar → configurar agentes y workflows → **Office**.

---

## Architecture

```text
Browser (React + React Flow)
        ↓
   Fastify API (:3001)
        ↓
   PostgreSQL (Prisma)     Redis (BullMQ)
        ↓                        ↓
   Tenant data              Worker + Scheduler
                                   ↓
                            Workflow engine → LLM providers
                                   ↓
                     projects/{tenant-slug}/  (workspace aislado)
```

- **Consenso:** `TenantConsensus` en PostgreSQL (equivalente a `memories/consensus.md` del CLI original), espejado al workspace para herramientas de archivos.
- **Aislamiento:** cada tenant filtrado por `tenantId`; sandbox en `projects/{tenant-slug}/`.
- **Secretos:** claves LLM cifradas con `ENCRYPTION_KEY` o `JWT_SECRET`.

---

## The 14-agent team

Herencia directa del diseño original: role prompting con modelos mentales de referentes, no “eres un developer genérico”.

| Layer | Role | Expert Persona |
|------|------|----------------|
| **Strategy** | CEO | Jeff Bezos |
| | CTO | Werner Vogels |
| | Inversion | Charlie Munger |
| **Product** | Product Design | Don Norman |
| | UI Design | Matias Duarte |
| | Interaction Design | Alan Cooper |
| **Engineering** | Full-Stack | DHH |
| | QA | James Bach |
| | DevOps/SRE | Kelsey Hightower |
| **Business** | Marketing | Seth Godin |
| | Operations | Paul Graham |
| | Sales | Aaron Ross |
| | CFO | Patrick Campbell |
| **Intelligence** | Research Analyst | Ben Thompson |

Definiciones en `.claude/agents/` · Skills en `.claude/skills/`.

---

## Standard workflows

| # | Workflow | Chain |
|---|----------|-------|
| 1 | New Product Evaluation | Research → CEO → Munger → Product → CTO → CFO |
| 2 | Feature Development | Interaction → UI → Full-stack → QA → DevOps |
| 3 | Product Launch | QA → DevOps → Marketing → Sales → Ops → CEO |
| 4 | Pricing and Monetization | Research → CFO → Sales → Munger → CEO |
| 5 | Weekly Review | Ops → Sales → CFO → QA → CEO |
| 6 | Opportunity Discovery | Research → CEO → Munger → CFO |

---

## Project structure (v2)

```text
auto-company/
├── src/                    # API, worker, engine, coordinator
├── frontend/               # React UI (Office, Ops, Settings, Admin)
├── prisma/                 # Schema, migrations, seed
├── projects/               # Tenant workspaces (runtime)
├── claude/agents/          # Agent personas (seeded to DB)
├── claude/skills/          # Reusable skills (seeded to DB)
├── archive/legacy-cli/     # Original bash auto-loop (archived)
├── docs/                   # Platform docs + agent outputs
├── docker-compose.yml
└── CLAUDE.md               # Charter, guardrails, team rules
```

---

## Production

See [`docker-compose.yml`](docker-compose.yml), [`.env.production.example`](.env.production.example), and [`docs/platform.md`](docs/platform.md).

---

## Legacy CLI (archived)

El workflow original (`auto-loop.sh` + `memories/consensus.md` + daemon macOS/WSL) **no forma parte del runtime v2**. Está preservado en [`archive/legacy-cli/`](archive/legacy-cli/README.md) como referencia histórica. Los stubs en `scripts/core/` muestran un mensaje de deprecación.

Para nuevos despliegues, usa la plataforma descrita arriba.

---

## Acknowledgments & Inspiration

### Agradecimientos

Este proyecto **no existiría sin la inspiración, el diseño y el trabajo del [Auto Company](https://github.com/MaxMiksa/Auto-Company) original**. Kreo Devs tomó esa visión — una empresa autónoma de agentes IA con personas de expertos, skills compartidos y memoria de consenso — y la reimaginó como plataforma multi-tenant con Office, worker y PostgreSQL.

**Gracias especialmente a:**

| Persona / proyecto | Contribución |
|--------------------|--------------|
| **[Zheyuan (Max) Kong](https://github.com/MaxMiksa)** · [MaxMiksa/Auto-Company](https://github.com/MaxMiksa/Auto-Company) | Autor del proyecto original: arquitectura de 14 agentes, `CLAUDE.md`, skills, workflows de convergencia y el loop CLI que demostró que una “empresa IA” puede operar de forma continua. |
| **[@JasonQWJ](https://github.com/JasonQWJ)** y **[@cnwillz](https://github.com/cnwillz)** | Propuestas e implementaciones tempranas de dashboard multi-plataforma que informaron el diseño de observabilidad. |
| **[nicepkg/auto-company](https://github.com/nicepkg/auto-company)** | Edición macOS inicial del concepto. |
| **[continuous-claude](https://github.com/AnandChowdhary/continuous-claude)** | Patrón de notas compartidas entre sesiones. |
| **[ralph-claude-code](https://github.com/frankbria/ralph-claude-code)** | Intercepción de señales de salida en loops autónomos. |
| **[claude-auto-resume](https://github.com/terryso/claude-auto-resume)** | Patrón de reanudación ante límites de uso. |

Conservamos en este repositorio las definiciones de agentes y skills del original (bajo `.claude/`) como **homenaje y base semántica**; el motor de ejecución, la UI y el modelo operativo son obra de **Auto Company Platform (Kreo Devs)**.

Si usas o extiendes este fork, considera dar visibilidad al repositorio original y respetar su licencia MIT.

**Proyecto original:** https://github.com/MaxMiksa/Auto-Company  
**Esta plataforma:** https://github.com/kreodevs/ia-company

---

## License

MIT — see [LICENSE](LICENSE) if present in the repository. The original Auto Company project is also MIT-licensed.
