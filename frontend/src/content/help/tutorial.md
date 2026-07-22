# Guía completa de Auto-Company Platform

> **Auto-Company** es una plataforma multi-tenant para orquestar equipos de agentes IA que investigan, deciden, implementan y lanzan productos de forma autónoma — con memoria compartida (*consensus*), workflows visuales y un scheduler que ejecuta ciclos sin intervención humana.

---

## Tabla de contenidos

1. [Primeros pasos](#primeros-pasos)
2. [Roles y acceso](#roles-y-acceso)
3. [Mapa de la aplicación](#mapa-de-la-aplicación)
4. [Agentes y skills](#agentes-y-skills)
5. [Workflows visuales](#workflows-visuales)
6. [Ejecuciones (Runs)](#ejecuciones-runs)
7. [Consensus — memoria compartida](#consensus--memoria-compartida)
8. [Operaciones multi-producto (Ops)](#operaciones-multi-producto-ops)
9. [Modo autónomo](#modo-autónomo)
10. [Configuración del tenant](#configuración-del-tenant)
11. [Administración de plataforma](#administración-de-plataforma)
12. [Productos en `projects/`](#productos-en-projects)
13. [CLI y automatización externa](#cli-y-automatización-externa)
14. [Despliegue en producción](#despliegue-en-producción)
15. [Solución de problemas](#solución-de-problemas)

---

## Primeros pasos

### Instalación local (desarrollo)

```bash
# Desde la raíz del repositorio
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed

# Terminal 1 — API
npm run dev

# Terminal 2 — Worker (cola + scheduler autónomo)
npm run worker

# Terminal 3 — Frontend
npm run dev:frontend
```

Abre **http://localhost:5173**.

### Primer arranque en la UI

| Paso | Ruta | Acción |
|------|------|--------|
| 1 | `/setup` | Crear el **superadmin** de plataforma (solo la primera vez) |
| 2 | `/admin` | Crear un **tenant** (organización) y clonar plantillas |
| 3 | Impersonación | Seleccionar el tenant en el header |
| 4 | `/settings` | Configurar LLM y activar **meta schedule** |
| 5 | `/ops` | Ver portfolio y lanzar el primer ciclo autónomo |

> **Tip:** Si ya existe superadmin, ve directo a `/login`.

---

## Roles y acceso

### Superadmin (plataforma)

- Acceso a `/admin`, plantillas globales y settings de plataforma.
- Puede **impersonar** cualquier tenant desde el selector del header.
- Sin impersonación activa, las rutas de tenant redirigen a `/admin`.

### Usuario de organización (tenant)

- Login con **slug del tenant** + email + contraseña.
- Acceso directo a workflows, runs, consensus, ops y settings (según rol).

### Roles dentro del tenant

| Rol | Permisos |
|-----|----------|
| **owner / admin** | Settings, schedules, equipo, límites de uso |
| **member** | Workflows, runs, consensus, ops (lectura/ejecución) |

---

## Mapa de la aplicación

| Ruta | Descripción |
|------|-------------|
| `/workflows` | Lista y creación de workflows |
| `/workflows/:id` | Editor visual (React Flow) — conectar agentes y ejecutar |
| `/agents` | CRUD de agentes (persona, modelo, temperatura, skills) |
| `/skills` | CRUD de skills (prompts reutilizables) |
| `/runs` | Historial de ejecuciones con coste y tokens |
| `/runs/:id` | Logs en vivo (SSE), memoria compartida, cancelar run |
| `/consensus` | Documento de memoria compartida entre ciclos |
| `/ops` | Dashboard multi-producto: portfolio, pipeline, próximo ciclo |
| `/settings` | LLM del tenant, notificaciones, límites, schedules |
| `/team` | Usuarios del tenant (admin) |
| `/admin` | Dashboard superadmin |
| `/admin/templates` | Plantillas globales de agents/skills/workflows |
| `/admin/settings` | Keys LLM, email, GitHub, rate limits de plataforma |
| `/help` | Esta sección de ayuda |

---

## Agentes y skills

### Agentes

Cada agente representa un **persona experta** (CEO, CTO, QA, etc.):

- **System prompt** — instrucciones base del rol.
- **Provider / model** — TokenLab, OpenRouter o custom (OpenAI-compatible).
- **Temperature** — creatividad vs. determinismo.
- **Skills vinculados** — conocimiento adicional inyectado en el prompt.

### Skills

Bloques de conocimiento especializado (research, devops, pricing, etc.). Se asignan a uno o más agentes y se incluyen automáticamente al ejecutar un step del workflow.

> **Buena práctica:** Mantén skills atómicos y reutilizables; evita duplicar prompts entre agentes.

---

## Workflows visuales

### Crear y editar

1. Ve a **Workflows → New workflow** o edita uno existente.
2. Arrastra **nodos de agente** al canvas.
3. Conecta los nodos con **edges** (flujo de datos/memoria).
4. Guarda el grafo.

### Ejecutar manualmente

En el editor:

- **Execute** — lanza el workflow.
- Por defecto carga el **consensus** del tenant como memoria inicial.
- Al completar, puede sincronizar resultados de vuelta al consensus.

### Workflows estándar (plantillas)

| Nombre | Propósito |
|--------|-----------|
| `opportunity-discovery` | Brainstorm de ideas → pipeline |
| `new-product-evaluation` | Evaluar idea → GO / NO-GO |
| `feature-development` | Implementar en `projects/{slug}/` |
| `product-launch` | Lanzamiento y growth |
| `pricing-and-monetization` | Pricing y monetización |

---

## Ejecuciones (Runs)

Cada ejecución crea un **ExecutionRun** con:

- Estado: `PENDING` → `RUNNING` → `COMPLETED` / `FAILED` / `CANCELLED`
- **Shared memory** — JSON acumulado entre steps
- **Logs** — por agente y step, con tokens y coste estimado
- **SSE stream** — logs en tiempo real en `/runs/:id`

### Herramientas disponibles para agentes

Durante un run, los agentes pueden invocar tools en el workspace:

| Tool | Función |
|------|---------|
| `read_file` / `write_file` / `list_dir` | Archivos en workspace |
| `shell` | Comando shell (timeout configurable) |
| `git_status` / `git_commit` | Git en el proyecto |
| `npm_run` | Scripts npm |
| `wrangler_deploy` | Deploy Cloudflare Workers |

> El workspace de un producto es `projects/{product-slug}/`. Sin producto focal, usa `projects/{tenant-slug}/`.

---

## Consensus — memoria compartida

Equivalente a `memories/consensus.md` del Auto-Company original.

### Qué guarda

- **Documento markdown** — decisiones, contexto, historial.
- **Next Action** — foco del próximo ciclo.
- **Company phase** — `exploring`, `validating`, `building`, `launching`, `growing`.

### Ciclo típico

```
Ejecutar workflow
  → Cargar consensus en memoria inicial
  → Agentes colaboran y actualizan memoria
  → Al terminar: persistir consensus + resumen del ciclo
  → Scheduler / meta-orchestrator repite
```

### Campos estructurados (memoria JSON)

Los agentes pueden escribir en shared memory:

| Campo | Efecto |
|-------|--------|
| `topIdeas[]` | Añade ideas al pipeline |
| `goNoGo` | `GO` / `NO-GO` → bootstrap o descarte |
| `productSlug`, `productName` | Registra producto en portfolio |
| `revenueUsd` | Marca producto como *growing* |

---

## Operaciones multi-producto (Ops)

La vista **`/ops`** concentra el estado de la “empresa autónoma”:

### Panel principal

- **Fase de empresa** y número de ciclo
- **Productos** en building / growing
- **Pipeline** de ideas pendientes de evaluación
- **Ingresos** registrados por producto
- **Preview del próximo run** — qué workflow elegirá el meta-orchestrator

### Acciones

- **Run meta cycle now** — dispara un ciclo inmediato
- **Focus** — marcar producto prioritario
- **GO / NO-GO** — decidir ideas del pipeline manualmente

### Límite de productos

Máximo **2 productos** simultáneos en fase *Building* o *Launching*. Productos en *Growing* (ej. SnapOG) no bloquean discovery de nuevas ideas.

---

## Modo autónomo

### Meta schedule (recomendado)

El **meta schedule** (`scheduleKind: meta`) no apunta a un workflow fijo. En cada tick el **meta-orchestrator** decide:

```
¿Hay idea pendiente?     → new-product-evaluation
¿Hay producto building?  → feature-development / product-launch
¿Solo growing?           → pricing / launch alternado
¿Pipeline vacío?         → opportunity-discovery
```

### Activar autonomía

1. **Settings → Enable meta schedule** (o ya creado al registrar tenant)
2. Verificar que el **worker** esté corriendo (`npm run worker` o contenedor Docker)
3. Intervalo por defecto: **1800 s** (30 min) — editable en Settings
4. Opcional: token **GitHub** en Admin → Platform Settings para commits autónomos

### Scheduler interno

El worker revisa schedules cada **60 s** (`schedulerTickMs` en platform settings). Cuando `nextRunAt` vence y el schedule está `enabled`, encola la ejecución.

### Schedules fijos (opcional)

Además del meta schedule puedes crear schedules que ejecuten **un workflow concreto** en intervalo fijo — útil para tareas repetitivas fuera del orquestador.

---

## Configuración del tenant

En **`/settings`** (admin del tenant):

### LLM

- Provider override (TokenLab / OpenRouter / custom)
- API key encriptada
- Modelo por defecto y **tope de coste por run**

### Notificaciones

- Webhook, Slack, email (Resend) al completar o fallar runs

### Límites de uso

- Runs, tokens y coste **mensuales** — el scheduler respeta estos límites

### Schedules

- Meta schedule (empresa autónoma)
- Schedules de workflow fijo

---

## Administración de plataforma

Solo **superadmin** en `/admin`:

### Crear tenant

- Nombre, slug, owner opcional
- **Clone templates** — copia agents, skills y workflows globales

### Plantillas (`/admin/templates`)

- Editar personas y workflows **maestros**
- **Reseed** — regenerar desde seed
- **Sync to tenants** — merge o update masivo

### Platform settings (`/admin/settings`)

| Setting | Uso |
|---------|-----|
| Public URL | Links en emails y CORS |
| LLM keys | Fallback para tenants sin override |
| Resend | Emails transaccionales |
| GitHub token | Tools `git_commit` / repos |
| Rate limits | Auth y execute por minuto |
| Shell timeout | Máximo tiempo de comandos |
| Scheduler tick | Frecuencia del loop del worker |

---

## Productos en `projects/`

Cada producto vive en su carpeta:

```
projects/
├── snapog/          # Ejemplo: API OG images (Cloudflare Worker)
└── mi-saas/         # Producto bootstrapped por un ciclo GO
```

Al aprobar un producto (`GO`), la plataforma:

1. Crea el registro `TenantProduct`
2. Bootstrap del workspace (`README`, estructura base)
3. Enfoca runs de desarrollo en `projects/{slug}/`

### SnapOG (producto incluido)

- API `/og` — generación de Open Graph images
- Registro en `/register`, dashboard en `/dashboard`
- Checkout Stripe en `/checkout?tier=pro` (si hay keys configuradas)

---

## CLI y automatización externa

### Un ciclo desde terminal

```bash
export API_URL=https://tu-dominio.com/api

# Meta (autónomo — elige workflow dinámicamente)
./scripts/platform/cycle.sh TU-SLUG owner@email.com 'password'

# Workflow fijo por UUID
./scripts/platform/cycle.sh TU-SLUG owner@email.com 'password' <workflow-id>
```

### API relevante

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/workflows/:id/execute` | POST | Ejecutar workflow |
| `/api/schedules` | GET/POST | Schedules del tenant |
| `/api/schedules/:id/run-now` | POST | Disparo manual |
| `/api/ops/portfolio` | GET | Estado multi-producto |
| `/api/ops/next-run` | GET | Preview meta-orchestrator |
| `/api/consensus` | GET/PUT | Memoria compartida |
| `/api/products` | GET | Portfolio de productos |

---

## Despliegue en producción

Stack Docker Compose (Dokploy-ready):

| Servicio | Función |
|----------|---------|
| `postgres` | Base de datos |
| `redis` | Cola BullMQ |
| `api` | Fastify + migraciones |
| `worker` | Procesador + **scheduler autónomo** |
| `web` | Frontend estático (nginx) |

Checklist post-deploy:

- [ ] `RUN_MIGRATIONS=true` en el primer deploy
- [ ] Variables `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, LLM keys
- [ ] Contenedor **worker** healthy y corriendo
- [ ] Meta schedule **enabled** en el tenant
- [ ] Platform settings → Public URL correcta

---

## Solución de problemas

### El scheduler no ejecuta nada

- ¿Está corriendo el **worker**? (no basta con la API)
- ¿El schedule está **enabled** y `nextRunAt` en el pasado?
- ¿Se alcanzó el **límite mensual** de runs/coste?

### Runs fallan por LLM

- Revisa keys en **Platform settings** o override del tenant
- Comprueba `maxCostUsdPerRun` del tenant

### Agentes no commitean / no despliegan

- Configura **GitHub token** en platform settings
- Verifica que el run use workspace `projects/{slug}/`

### 404 en producción tras login

- El contenedor `web` debe pasar healthcheck (Traefik excluye unhealthy)
- Rutas SPA: nginx debe servir `index.html` en rutas del frontend

### Stuck en la misma Next Action

El motor de **convergencia** detecta repetición y fuerza un pivot en el consensus tras 2 ciclos iguales.

---

## Resumen: ¿está autónomo?

| Componente | ¿Automático? |
|------------|--------------|
| Elección de workflow | ✅ Meta-orchestrator |
| Memoria entre ciclos | ✅ Consensus |
| Ejecución periódica | ✅ Worker + meta schedule |
| Implementación de código | ✅ Tools en workspace (con LLM + keys) |
| Deploy a producción | ⚙️ Con `wrangler_deploy` + credenciales |
| Setup inicial humano | ❌ Una vez: keys, tenant, enable schedule |

---

> **Siguiente paso recomendado:** impersona tu tenant → **Settings → Enable meta schedule** → **Ops → Run meta cycle now** → observa el run en **Runs**.

¿Dudas? Edita el consensus manualmente en `/consensus` para orientar el foco del próximo ciclo.
