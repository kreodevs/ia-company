<div align="center">

# Auto Company Platform

**Plataforma multi-tenant para orquestar una empresa de agentes IA** — Office, workflows visuales, consenso en PostgreSQL y ejecución bajo demanda o programada.

Desarrollado y mantenido por **[Kreo Devs](https://github.com/kreodevs)** · [`ia-company`](https://github.com/kreodevs/ia-company)

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](#inicio-rápido)
[![React](https://img.shields.io/badge/UI-React-61DAFB?logo=react&logoColor=black)](#arquitectura)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](#arquitectura)
[![Redis](https://img.shields.io/badge/Queue-Redis-BullMQ-DC382D?logo=redis&logoColor=white)](#arquitectura)
[![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)](#producción)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)

</div>

---

## Qué es

**Auto Company Platform** es una aplicación web **self-hosted** y **multi-tenant** para coordinar equipos de agentes IA con roles de expertos, skills reutilizables y workflows encadenados.

Cada organización (tenant) tiene sus propios agentes, workflows, productos, consenso y workspace aislado. El modelo operativo es **Office-first**: tú defines el encargo, apruebas el brief y la plataforma ejecuta.

---

## Cómo opera (v2)

```text
/office  →  Coordinador (chat + brief)
         →  Aprobación (equipo, presupuesto, alcance)
         →  Worker + motor de workflows
         →  Proveedores LLM (OpenRouter, OpenCode, …)
         →  Consenso y artefactos en PostgreSQL + projects/{tenant}/
```

| Paso | Dónde | Qué pasa |
|------|--------|----------|
| 1 | `/office` | Conversas con el coordinador y defines el encargo |
| 2 | Office | Revisas y apruebas el brief antes de ejecutar |
| 3 | Worker | Encola y ejecuta el workflow paso a paso |
| 4 | Settings → Orchestration | *(Opcional)* Reglas fijas disparan workflows por intervalo o cron |
| 5 | `/ops` | Portfolio, pipeline de ideas, decisiones GO/NO-GO |

Rutas clave: `/office` · `/office/workflows` · `/ops` · `/settings` · `/admin`

Documentación: [`docs/platform.md`](docs/platform.md) · [`CLAUDE.md`](CLAUDE.md)

---

## Capacidades

| Área | Funcionalidad |
|------|----------------|
| **Office** | Chat con coordinador, síntesis de brief, aprobación previa |
| **Workflows** | Editor visual (React Flow) |
| **Agents & skills** | CRUD por tenant; plantillas desde seed |
| **Ops** | Productos, pipeline, decisiones |
| **Orchestration** | Schedules por workflow |
| **Integrations** | SMTP, MCP, OpenCode, GitHub |
| **Admin** | Superadmin, impersonación, límites de coste, auditoría |

---

## Stack

| Capa | Tecnología |
|------|------------|
| API | Node.js · Fastify · Prisma · PostgreSQL |
| Cola | Redis · BullMQ · worker + scheduler |
| UI | React · React Flow · Tailwind v4 |
| Deploy | Docker Compose (Dokploy) |

---

## Inicio rápido

```bash
cp .env.example .env
# DATABASE_URL, JWT_SECRET, REDIS_URL, claves LLM

npm install
npx prisma migrate dev
npm run db:seed

npm run dev          # API :3001
npm run worker       # worker + scheduler
npm run dev:frontend # UI :5173
```

Primera visita: `/setup` → superadmin → `/admin` → tenant → impersonar → agentes/workflows → **Office**.

---

## Arquitectura

```text
Browser (React + React Flow)
        ↓
   Fastify API (:3001)
        ↓
   PostgreSQL (Prisma)     Redis (BullMQ)
        ↓                        ↓
   Datos por tenant         Worker + Scheduler
                                   ↓
                            Motor de workflows → LLM
                                   ↓
                     projects/{tenant-slug}/  (sandbox)
```

- **Consenso:** `TenantConsensus` en PostgreSQL, espejado al workspace para herramientas de archivos.
- **Aislamiento:** filtrado por `tenantId`; sandbox en `projects/{tenant-slug}/`.
- **Secretos:** claves LLM cifradas (`ENCRYPTION_KEY` o `JWT_SECRET`).

---

## Equipo de 14 agentes

Role prompting con modelos mentales de referentes reales (CEO, CTO, producto, ingeniería, negocio, research). Definiciones en `.claude/agents/`; skills en `.claude/skills/`.

| Capa | Rol | Persona |
|------|-----|---------|
| **Strategy** | CEO · CTO · Inversión | Bezos · Vogels · Munger |
| **Product** | Producto · UI · Interacción | Norman · Duarte · Cooper |
| **Engineering** | Full-stack · QA · DevOps | DHH · Bach · Hightower |
| **Business** | Marketing · Ops · Sales · CFO | Godin · Graham · Ross · Campbell |
| **Intelligence** | Research | Thompson |

---

## Workflows estándar

| # | Workflow | Cadena |
|---|----------|--------|
| 1 | New Product Evaluation | Research → CEO → Munger → Product → CTO → CFO |
| 2 | Feature Development | Interaction → UI → Full-stack → QA → DevOps |
| 3 | Product Launch | QA → DevOps → Marketing → Sales → Ops → CEO |
| 4 | Pricing and Monetization | Research → CFO → Sales → Munger → CEO |
| 5 | Weekly Review | Ops → Sales → CFO → QA → CEO |
| 6 | Opportunity Discovery | Research → CEO → Munger → CFO |

---

## Estructura del repo

```text
auto-company/
├── src/              # API, worker, engine, coordinator
├── frontend/         # UI (Office, Ops, Settings, Admin)
├── prisma/           # Schema, migrations, seed
├── projects/         # Workspaces de tenants (runtime)
├── claude/           # Agentes y skills (seed)
├── docs/             # Documentación de plataforma
├── docker-compose.yml
└── CLAUDE.md         # Misión, guardrails, equipo
```

---

## Producción

[`docker-compose.yml`](docker-compose.yml) · [`.env.production.example`](.env.production.example) · [`docker/README.md`](docker/README.md) · [`docs/platform.md`](docs/platform.md)

En Dokploy: Compose → variables de entorno → dominio al servicio `web:80` → `/setup` en el primer acceso.

---

## Agradecimientos

Este proyecto está **inspirado** en [Auto Company](https://github.com/MaxMiksa/Auto-Company) de **Zheyuan (Max) Kong** — especialmente las personas de los 14 agentes, la biblioteca de skills y la idea de memoria de consenso entre ciclos. Kreo Devs desarrolló el motor, la UI y el modelo multi-tenant de esta plataforma.

| Persona / proyecto | Contribución |
|--------------------|--------------|
| **[MaxMiksa/Auto-Company](https://github.com/MaxMiksa/Auto-Company)** | Concepto, agentes, skills y charter (`CLAUDE.md`) |
| **[@JasonQWJ](https://github.com/JasonQWJ)** · **[@cnwillz](https://github.com/cnwillz)** | Ideas tempranas de dashboard |
| **[nicepkg/auto-company](https://github.com/nicepkg/auto-company)** | Edición macOS del concepto |
| **[continuous-claude](https://github.com/AnandChowdhary/continuous-claude)** · **[ralph-claude-code](https://github.com/frankbria/ralph-claude-code)** · **[claude-auto-resume](https://github.com/terryso/claude-auto-resume)** | Patrones de loops y memoria entre sesiones |

**Original:** https://github.com/MaxMiksa/Auto-Company · **Esta plataforma:** https://github.com/kreodevs/ia-company

---

## Licencia

MIT. El proyecto original Auto Company también usa licencia MIT.
