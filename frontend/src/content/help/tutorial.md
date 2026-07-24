# Guía de Auto-Company Platform

> **Auto-Company** es una plataforma multi-tenant con **Oficina bajo demanda**: tú encargas el trabajo a un coordinador y un equipo de agentes IA; ellos investigan, deciden, implementan y documentan en productos reales bajo `projects/`. La programación automática es **opcional**.

---

## Qué puedes hacer con la aplicación

Esta sección es tu **tutorial de inicio**. Resume el flujo actual de la plataforma tras el rediseño hacia la Oficina.

### En una frase

Gestionar **productos y oportunidades** con agentes especializados (CEO, CTO, producto, código, growth…) que comparten memoria (*consensus*), trabajan en workspaces por producto y se lanzan **desde la Oficina** cuando tú lo decides.

### Flujo principal: la Oficina

1. Entra en **`/office`** — home del tenant tras el login.
2. Habla con el **coordinador** o elige un **servicio rápido** (discovery, evaluación, build…).
3. Revisa el **plan de equipo** (agentes, coste estimado, alcance) y pulsa **Aprobar y ejecutar**.
4. Sigue el progreso en **War room** (`/war-room/:productId`) en vivo.
5. Cuando termina, el **encargo** aparece en **`/office/encargos`** con informe final y documentos del equipo.

> **Por defecto no hay ciclos automáticos.** El plan de operaciones arranca en modo *bajo demanda* (0 reglas). Activa presets en **Configuración → Programaciones** solo si quieres discovery semanal u otra automatización parcial.

### Si eres superadmin (plataforma)

| Paso | Dónde | Qué consigues |
|------|-------|---------------|
| 1 | `/admin/settings` | LLM compartido (OpenRouter o TokenLab), email, rate limits |
| 2 | `/admin` | Crear **tenants** y clonar plantillas globales |
| 3 | `/admin/templates` | Editar **agentes, skills y workflows** maestros |
| 4 | Selector del header | **Impersonar** un tenant y probar la Oficina |

### Si eres usuario de organización (tenant)

| Paso | Dónde | Qué consigues |
|------|-------|---------------|
| 1 | `/office` | Encargar trabajo al coordinador |
| 2 | `/products` | Registrar productos (GitHub o nuevo), pipeline, foco |
| 3 | `/war-room/:id` | Vista táctica en vivo + chat con el coordinador |
| 4 | `/office/encargos` | Historial de encargos e informes |
| 5 | `/debug/runs` | Logs técnicos, tokens y coste |
| 6 | `/settings` | Integraciones, OpenCode, límites, programaciones |

### Tutorial express (15 minutos)

1. **Login** con el slug de tu organización en `/login`.
2. Abre **Oficina** → pide al coordinador *“Explora 3 ideas de micro-SaaS”* o usa el servicio de discovery.
3. Aprueba el plan → observa el run en **War room**.
4. Ve a **Productos** → registra un repo existente (URL GitHub + opcional *product-intake*) o crea uno nuevo.
5. En el producto: **Consenso**, **Código** y **OpenCode** (agente/modelo/ruta por producto).
6. Revisa el encargo terminado en **Mis encargos**.
7. (Opcional) **Configuración → Programaciones** → preset *Solo discovery* si quieres piloto automático los sábados.

### Qué hace cada área principal

| Área | Para qué sirve |
|------|----------------|
| **Oficina** | Coordinador conversacional, servicios rápidos, ROI y gasto mensual |
| **Mis encargos** | Bandeja de trabajos encargados con informe final |
| **Productos** | Portfolio, pipeline de ideas, registro GitHub, foco, lanzadores |
| **War room** | Mesa táctica por producto: agentes en vivo, documentos, coordinador |
| **Oficina de depuración** | Runs, consenso, ops, decisiones, catálogo IA (workflows/agentes/skills) |
| **Configuración** | LLM tenant, OpenCode global, GitHub, notificaciones, límites, schedules |
| **Ayuda** | Esta guía |

### Modos de uso

| Modo | Cuándo | Cómo |
|------|--------|------|
| **Bajo demanda** (default) | Uso diario, control total | Oficina → aprobar plan → war room |
| **Programación fija** | Discovery semanal, revisión lunes | Settings → Programaciones → preset o regla |
| **Depuración técnica** | Ajustar agentes, ver logs SSE | `/debug/*` |

> **Consejo:** Domina un encargo manual desde la Oficina antes de activar schedules.

---

## Tabla de contenidos

1. [Qué puedes hacer con la aplicación](#qué-puedes-hacer-con-la-aplicación)
2. [Primeros pasos](#primeros-pasos)
3. [Roles y acceso](#roles-y-acceso)
4. [Mapa de la aplicación](#mapa-de-la-aplicación)
5. [La Oficina bajo demanda](#la-oficina-bajo-demanda)
6. [Productos y portfolio](#productos-y-portfolio)
7. [War room y encargos](#war-room-y-encargos)
8. [Agentes, skills y workflows](#agentes-skills-y-workflows)
9. [Ejecuciones (Runs)](#ejecuciones-runs)
10. [Consensus y memoria](#consensus-y-memoria)
11. [Operaciones y programación](#operaciones-y-programación)
12. [Configuración del tenant](#configuración-del-tenant)
13. [OpenCode e integraciones](#opencode-e-integraciones)
14. [Administración de plataforma](#administración-de-plataforma)
15. [Despliegue y worker](#despliegue-y-worker)
16. [Solución de problemas](#solución-de-problemas)

---

## Primeros pasos

### Instalación local (desarrollo)

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed

# Terminal 1 — API
npm run dev

# Terminal 2 — Worker (cola + scheduler opcional)
npm run worker

# Terminal 3 — Frontend
npm run dev:frontend
```

Abre **http://localhost:5173**. Tras login de tenant aterrizas en **`/office`**.

### Primer arranque en la UI

| Paso | Ruta | Acción |
|------|------|--------|
| 1 | `/setup` | Crear **superadmin** (solo la primera vez) |
| 2 | `/admin` | Crear tenant y clonar plantillas |
| 3 | Header | Impersonar el tenant |
| 4 | `/settings?tab=integrations` | Token **GitHub** (repos privados e intake) |
| 5 | `/office` | Primer encargo al coordinador |

---

## Roles y acceso

### Superadmin (plataforma)

- Acceso a `/admin`, plantillas globales y settings de plataforma.
- **Impersona** tenants desde el selector del header.
- Sin impersonación, las rutas de tenant redirigen a `/admin`.

### Usuario de organización (tenant)

- Login: **slug** + email + contraseña.
- Aterrizaje por defecto: **`/office`**.

### Roles dentro del tenant

| Rol | Permisos |
|-----|----------|
| **owner / admin** | Settings, equipo, límites, programaciones |
| **member** | Oficina, productos, war room, depuración (lectura/ejecución) |

---

## Mapa de la aplicación

### Oficina (flujo humano)

| Ruta | Descripción |
|------|-------------|
| `/` · `/office` | Coordinador, servicios, actividad, ROI |
| `/office/encargos` | Bandeja de encargos |
| `/office/encargos/:runId` | Informe final + documentos del equipo |
| `/products` | Portfolio, pipeline, añadir producto |
| `/war-room/:productId` | War room táctico por producto |
| `/debug/products/:id/consensus` | Memoria técnica del producto (depuración) |
| `/products/:id/code` | Workspace + OpenCode por producto |
| `/settings` | Configuración del tenant |
| `/help` | Centro de ayuda |

### Oficina de depuración (técnico)

| Ruta | Descripción |
|------|-------------|
| `/debug/runs` · `/debug/runs/:id` | Ejecuciones y logs SSE |
| `/debug/consensus` | Consenso del tenant |
| `/debug/ops` | KPIs y programaciones activas |
| `/debug/decisions` | Propuestas go/no-go |
| `/debug/workflows` · `/debug/workflows/:id` | Editor visual React Flow |
| `/debug/agents` · `/debug/skills` | Catálogo IA |
| `/debug/team` | Usuarios del tenant (admin) |

### Plataforma (superadmin)

| Ruta | Descripción |
|------|-------------|
| `/admin` | Dashboard y tenants |
| `/admin/settings` | LLM, email, rate limits |
| `/admin/templates` | Plantillas globales |

---

## La Oficina bajo demanda

### Coordinador

Chat en **`/office`** con contexto del tenant y, si eliges alcance, de un **producto concreto**. Propone:

- Equipo de agentes y orden de trabajo
- Coste estimado y presupuesto mensual visible en sidebar
- Enlace directo al war room al ejecutar

### Servicios rápidos

Atajos predefinidos (discovery, evaluación, etc.) que saltan la conversación y generan un plan listo para aprobar.

### Notificaciones

Campana en el header → aviso cuando un encargo termina o falla. En móvil el panel respeta *safe area*.

### Gasto mensual

Widget en sidebar (*Gasto mensual*) con barra de progreso respecto a límites del tenant.

---

## Productos y portfolio

Cada producto vive en **`projects/{slug}/`** con fase, revenue, foco y workspace propio.

### Añadir producto

En **`/products` → Añadir producto**:

| Modo | Uso |
|------|-----|
| **Registrar existente** | URL GitHub, clone opcional, workflow `product-intake` para perfil |
| **Crear nuevo** | Bootstrap vacío en `projects/{slug}/` |

**Requisito:** token GitHub en **Settings → Integraciones** para repos privados y enriquecimiento API.

### Pipeline y decisiones

- Ideas del discovery → pipeline en Productos
- **GO / NO-GO** manual o vía workflow de evaluación
- Propuestas de agentes → **`/debug/decisions`**

### Foco

Un solo producto **en foco** prioriza desarrollo y encargos con alcance producto.

### Perfil de producto

Tras intake: `product-profile.json`, metadata y consenso del producto alimentan prompts de agentes en runs focalizados.

---

## War room y encargos

### War room (`/war-room/:productId`)

- Vista táctica mientras corre un workflow
- Launcher: workflows y agentes individuales por producto
- Documentos generados en `docs/{rol}/`

### Encargos (`/office/encargos`)

- Lista de trabajos encargados desde la Oficina
- Detalle: **informe final** a ancho completo + sidebar de documentos por agente
- Markdown enriquecido (GFM, Mermaid, gráficos)

### Relación run ↔ encargo

Durante ejecución → war room. Al completar → encargo humano con informe legible (temas claro/oscuro).

---

## Agentes, skills y workflows

### Agentes (`/debug/agents`)

Persona experta: system prompt, modelo, temperatura, skills vinculados.

### Skills (`/debug/skills`)

Bloques de conocimiento reutilizables inyectados en el prompt.

### Workflows (`/debug/workflows`)

Grafo visual: orden de agentes, memoria compartida, ejecución manual desde el editor.

### Workflows estándar (plantillas)

| Nombre | Propósito |
|--------|-----------|
| `opportunity-discovery` | Ideas → pipeline |
| `new-product-evaluation` | Evaluación → GO/NO-GO |
| `product-intake` | Perfil de producto desde GitHub |
| `feature-development` | Implementación en workspace |
| `product-launch` | Lanzamiento |
| `pricing-and-monetization` | Pricing |
| `weekly-review` | Revisión operativa |

---

## Ejecuciones (Runs)

Cada run (`/debug/runs/:id`) incluye:

- Estado: `PENDING` → `RUNNING` → `COMPLETED` / `FAILED` / `CANCELLED`
- **Shared memory** entre steps
- **Logs SSE** en tiempo real
- Tokens y coste estimado

### Herramientas de agentes

| Tool | Función |
|------|---------|
| `read_file` / `write_file` / `list_dir` | Archivos en workspace del producto |
| `shell` | Comandos (timeout configurable) |
| `git_*` | Git en el proyecto |
| `npm_run` | Scripts npm |
| `wrangler_deploy` | Deploy Cloudflare |

---

## Consensus y memoria

### Consenso del tenant (`/debug/consensus`)

Documento markdown compartido: decisiones, fase de empresa, **Next Action** humana.

### Consenso por producto (`/debug/products/:id/consensus`)

Memoria técnica del producto, revisiones e informes — solo **Oficina de depuración**. En la oficina humana usa **Encargos** para ver entregables.

### Campos estructurados (shared memory)

| Campo | Efecto |
|-------|--------|
| `topIdeas[]` | Ideas al pipeline |
| `goNoGo` | GO / NO-GO |
| `productSlug` | Registro en portfolio |
| `revenueUsd` | Fase *growing* |

---

## Operaciones y programación

### Vista Ops (`/debug/ops`)

KPIs, fase, portfolio resumido, programaciones activas y preview de próximos 7 días.

### Plan de operaciones (Settings → Programaciones)

| Preset | Reglas |
|--------|--------|
| **Bajo demanda** (default) | 0 — control desde Oficina |
| **Solo discovery** | Discovery semanal sábados si pipeline vacío |
| **Exploración ligera** | Discovery + evaluación + revisión lunes |

Reglas **fijas** por workflow; el orquestador dinámico (meta) queda como opción avanzada al crear reglas manualmente — **no es el flujo recomendado**.

### Worker

El contenedor **`worker`** procesa cola y evalúa schedules cada ~60 s. Sin worker, las programaciones no disparan solas (la Oficina sigue funcionando).

---

## Configuración del tenant

Pestañas en **`/settings`**:

| Pestaña | Contenido |
|---------|-----------|
| **General** | Intereses de discovery |
| **LLM** | Override de modelo, tope coste/run (proveedor vía superadmin) |
| **OpenCode** | URL, credenciales y *enabled* **globales** |
| **Integraciones** | Token GitHub, SMTP del tenant para email de agentes |
| **Servidores MCP** | Registrar MCP stdio, grants por agente, sync de tools |
| **Notificaciones** | Webhook, Slack, email, in-app |
| **Límites** | Runs/tokens/coste mensual |
| **Programaciones** | Plan de operaciones y reglas |

---

## OpenCode e integraciones

### GitHub (tenant)

**Settings → Integraciones** — PAT con scope `repo` para clone, README, languages y `product-intake`.

**SMTP (misma pestaña)** — Host, credenciales, allowlist y tope diario para que los agentes usen `send_email`. Solo direcciones permitidas; cada envío queda auditado.

**Settings → Servidores MCP** — Comandos stdio, sync de herramientas y grants por agente. Modo solo lectura bloquea tools mutables por defecto; cada servidor tiene presupuesto de llamadas por run.

### OpenCode

| Nivel | Qué configuras |
|-------|----------------|
| **Tenant** | Base URL, usuario, contraseña, activar/desactivar, auto-approve |
| **Producto** (`/products/:id/code`) | Agente default, modelo, ruta del proyecto |

La delegación a OpenCode usa la config **por producto** al implementar código.

---

## Administración de plataforma

### Crear tenant

Nombre, slug, owner, **clone templates**.

### Plantillas (`/admin/templates`)

Agentes, skills y workflows maestros. **Sync to tenants** para propagar cambios.

### Platform settings

| Setting | Uso |
|---------|-----|
| LLM provider + key | OpenRouter o TokenLab (uno activo) |
| Public URL | Emails y CORS |
| Resend | Email transaccional |
| Rate limits | Auth y execute |
| Scheduler tick | Frecuencia del worker |

> El token GitHub de **plataforma** (si existiera) es distinto del token **por tenant** en Integraciones.

---

## Despliegue y worker

Stack Docker Compose (Dokploy-ready): `postgres`, `redis`, `api`, `worker`, `web`.

Checklist:

- [x] Migraciones en deploy — automáticas vía entrypoint del api (`RUN_MIGRATIONS` true por defecto)
- [ ] `worker` healthy (schedules + cola)
- [ ] LLM configurado en `/admin/settings`
- [ ] Token GitHub en tenant si usas intake privado
- [ ] Plan de operaciones: *bajo demanda* salvo que quieras autopilot parcial

---

## Solución de problemas

### No puedo clonar un repo privado

- Token GitHub en **Settings → Integraciones** del tenant
- Probar conexión en la misma pestaña

### La programación no ejecuta nada

- ¿Corre el **worker**?
- ¿Hay reglas **activas** en Programaciones? (default: ninguna)
- ¿Límite mensual alcanzado?

### Runs fallan por LLM

- Superadmin → `/admin/settings`: proveedor activo + API key
- Revisar `maxCostUsdPerRun` en Settings → LLM

### OpenCode no delega

- OpenCode activo en Settings → OpenCode (global)
- Agente/modelo/ruta configurados en **Código del producto**

### Encargo sin contraste en markdown

- Usa tema **Stripe HDS Light**, **Paperclip Warm** o **Slash**; los informes usan tokens `--office-*`

### Atascado en la misma Next Action

El motor de **convergencia** fuerza pivot tras ciclos repetidos — edita consenso manualmente si hace falta.

---

> **Siguiente paso:** impersona tu tenant → **`/office`** → encarga un discovery → sigue en **War room** → revisa el informe en **Mis encargos**.
