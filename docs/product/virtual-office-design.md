# Diseño — Oficina virtual por departamentos

> **Estado:** propuesta de diseño (2026-07-29)  
> **Prioridad:** reemplazar la metáfora narrativa por una experiencia espacial y departamental  
> **Principio rector:** el usuario piensa en **departamentos y funciones**, no en nombres de persona (Bezos, Vogels…)

---

## Problema que resolvemos

Hoy la plataforma es un **centro de mando** (KPIs + chat + encargos). El usuario espera una **oficina con empleados** pero encuentra:

- Agentes como slugs técnicos con emoji
- Documentos repartidos en 5+ pantallas
- War room solo por producto, no por empresa
- Repo analysis oculto en Productos

Este diseño propone una **capa de experiencia** sobre el motor existente (coordinador → encargo → war room → docs), sin reescribir el backend.

---

## Modelo mental correcto

```
Fundador
   └── Coordinador (recepción)
         └── Departamentos (salas)
               └── Especialistas (roles, no personas)
                     └── Encargos → Documentos
```

| Capa | Metáfora | Implementación actual | Propuesta |
|------|----------|----------------------|-----------|
| Entrada | Recepción | Chat en dashboard | **Lobby** con coordinador prominente |
| Organización | Plantas / salas | Org units como cards | **Planta de oficina** clickeable |
| Equipo | Empleados | Dots con emoji | **Ficha por rol** (Estrategia, Ingeniería…) |
| Trabajo en vivo | Ver reunión | War room por producto | **Sala de juntas** del departamento o producto |
| Archivo | Archivador | Encargos + consensus | **Hub documental** filtrable |

---

## Wireframe — Vista principal: Planta de oficina

Reemplaza o complementa `/office` como vista por defecto. El dashboard de KPIs pasa a un panel lateral colapsable.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏢 Tu oficina virtual                    [KPIs ▾]  [Encargos]  [Config]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────┐     CORREDOR CENTRAL                                │
│   │  🎩 RECEPCIÓN    │     (estado global: 2 deptos activos, 1 encargo)   │
│   │  Coordinador     │                                                      │
│   │  [ Hablar ]      │     ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│   └──────────────────┘     │ ESTRATEGIA  │  │ INGENIERÍA  │  │ MARKETING│ │
│                            │  🔍 📈 👔   │  │  🛠️ 💻 🧪  │  │  📣 💼   │ │
│                            │  2 idle     │  │  ● 1 busy   │  │  idle    │ │
│                            │  [ Entrar ] │  │  [ Entrar ] │  │ [Entrar] │ │
│                            └─────────────┘  └─────────────┘  └──────────┘ │
│                                                                             │
│                            ┌─────────────┐  ┌─────────────┐                │
│                            │  PRODUCTO   │  │  FINANZAS   │                │
│                            │  🧭 🎨 🎯   │  │  💰 🧐      │                │
│                            │  idle       │  │  idle       │                │
│                            │  [ Entrar ] │  │  [ Entrar ] │                │
│                            └─────────────┘  └─────────────┘                │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  📁 Archivo reciente          │  ⚡ Encargos activos (2)            │  │
│   │  • Informe mercado LATAM      │  • Análisis repo → Ingeniería       │  │
│   │  • ADR arquitectura v2        │  • Validación idea → Estrategia     │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Comportamiento

- **Cada sala = Org Unit** (departamento existente) o **departamento virtual** mapeado desde agentes sin org unit
- Click en sala → **vista de departamento** (wireframe 2)
- Recepción → chat coordinador a pantalla completa o panel lateral ancho
- Archivo reciente → hub documental (wireframe 3) pre-filtrado

### Departamentos virtuales por defecto (sin Org Studio)

Si el tenant no creó departamentos, agrupar agentes por capa de `CLAUDE.md`:

| Sala | Agentes | Color acento |
|------|---------|--------------|
| Estrategia | ceo-bezos, research-thompson, critic-munger | azul |
| Producto | product-norman, interaction-cooper, ui-duarte | violeta |
| Ingeniería | cto-vogels, fullstack-dhh, qa-bach, devops-hightower | cyan |
| Negocio | cfo-campbell, sales-ross, operations-pg, marketing-godin | ámbar |

Esto resuelve tu intuición: **no hace falta “Bezos”** — basta **“Estrategia”** y **“Ingeniería”**.

---

## Wireframe — Vista de departamento (sala)

Ruta propuesta: `/office/departments/:id` o reutilizar `/org-units/:id` con layout renovado.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Planta    INGENIERÍA                          [ Pedir encargo a este dept ]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                    SALA DE JUNTAS (war room lite)               │    │
│     │                                                                 │    │
│     │         🛠️ Arquitectura          💻 Implementación              │    │
│     │              idle                    ● analizando repo          │    │
│     │                                                                 │    │
│     │                    🧪 Calidad                                   │    │
│     │                       idle                                      │    │
│     │                                                                 │    │
│     │   [ Ver war room completa → ]  (si hay producto en foco )      │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─ Especialistas ─────────────────┐  ┌─ Documentos del departamento ──┐  │
│  │ 🛠️ Arquitectura    Disponible   │  │ Hoy                            │  │
│  │    ADR, deuda técnica, stack    │  │ • ADR-003 auth OAuth           │  │
│  │    [ Ver ficha ] [ Asignar ]    │  │ • Informe análisis repo X      │  │
│  │                                 │  │                                │  │
│  │ 💻 Implementación  ● Ocupado    │  │ Esta semana                    │  │
│  │    Feature sprint encargo #42   │  │ • Notas refactor módulo API    │  │
│  │    [ Ver encargo ]              │  │                                │  │
│  └─────────────────────────────────┘  └────────────────────────────────┘  │
│                                                                             │
│  Productos vinculados: [ SnapOG ] [ Auto-Company ]                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Ficha de especialista (rol, no persona)

Modal o panel lateral — **no** página separada por agente:

```
┌─ Especialista: Arquitectura ─────────────────────┐
│  Departamento: Ingeniería                        │
│  Estado: Disponible                              │
│  Modelo: claude-sonnet / provider X              │
│                                                  │
│  Qué hace                                        │
│  • ADRs, selección técnica, deuda, performance   │
│                                                  │
│  Encargos recientes                              │
│  • #41 Revisión stack — completado               │
│  • #38 ADR caché Redis — completado             │
│                                                  │
│  Documentos (3)                                  │
│  • docs/cto/ADR-003.md                           │
│                                                  │
│  [ Incluir en nuevo encargo ]  [ Configurar → ]  │
└──────────────────────────────────────────────────┘
```

**Display name:** traducir slug → rol legible (`cto-vogels` → “Arquitectura”, no “Werner Vogels”).

---

## Wireframe — Hub documental (archivo de la oficina)

Ruta propuesta: `/office/archive` — agrega encargos, consensus y artefactos de org units.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📁 Archivo de la oficina                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Filtrar: [Todos ▾] [Departamento ▾] [Producto ▾] [Agente/Rol ▾] [Fecha ▾]  │
│  Buscar: [________________________________________]                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Vista: ( Lista ) ( Por departamento ) ( Por encargo )                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ Encargo #42 — Análisis repo github.com/acme/app ─────────────────────┐  │
│  │  Ingeniería · Completado · hace 2h · $0.84                            │  │
│  │  ├─ Informe final (coordinador)                                       │  │
│  │  ├─ ADR arquitectura (Arquitectura)                                   │  │
│  │  └─ Informe calidad (Calidad)                                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ Encargo #38 — Escaneo mercado LATAM ─────────────────────────────────┐  │
│  │  Estrategia · Completado · ayer                                       │  │
│  │  └─ Informe oportunidad (Investigación)                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Panel derecho: preview markdown (RichMarkdownView existente)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Fuente de datos (sin nuevo backend):**

- `office-encargos.ts` → documentos por encargo
- `ProductAgentDocsPanel` → docs por producto
- `ArtifactGallery` → artefactos de org unit

---

## Wireframe — Recepción / Coordinador

El chat actual se mantiene; cambia **jerarquía visual**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎩 Coordinador — Chief of Staff                                             │
│  "Dime qué necesitas. Formo el equipo mínimo del departamento correcto."     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ Historial conversación ]                                                 │
│                                                                             │
│  ┌─ Servicios rápidos (chips) ──────────────────────────────────────────┐  │
│  │ 🔍 Mercado  🎯 Validar  💻 Feature  📦 Repo  🚀 Launch  💰 Pricing …  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Alcance: ( General ) ( Producto ▾ ) ( Departamento ▾ )                     │
│                                                                             │
│  [ Describe tu encargo…                                    ] [ Proponer ]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cambio clave:** servicios rápidos incluyen **Analizar repositorio** (implementado en fase 3).

---

## Flujos de usuario

### Flujo A — “Quiero ver mi oficina trabajando”

```
Planta → click departamento con ● busy → Sala → War room lite → Encargo activo
```

### Flujo B — “Necesito un informe que hicieron ayer”

```
Planta → Archivo reciente  OR  /office/archive → filtrar departamento → preview
```

### Flujo C — “Analiza este repo de GitHub”

```
Recepción → chip "Analizar repo" → pegar URL → plan (Ingeniería: Arq + Dev + QA) → aprobar
→ War room (si hay producto) o Encargos → docs en Archivo
```

### Flujo D — “Quiero un departamento de marketing”

```
Org Studio → crear departamento → aparece nueva sala en Planta → encargos scoped al dept
```

---

## Mapa de componentes → código existente

| Componente propuesto | Reutilizar | Crear |
|---------------------|------------|-------|
| Planta de oficina | `OrgUnitsPage`, `OfficePage` roster, `avatarGradient` | `OfficeFloorPlan.tsx` |
| Sala de departamento | `OrgUnitDetailPage`, `WarRoomContent` seats | `DepartmentRoom.tsx` |
| Ficha especialista | `AgentsPage` data, encargos API | `SpecialistPanel.tsx` |
| Hub documental | `OfficeEncargoDetailPage`, `RichMarkdownView` | `OfficeArchivePage.tsx` |
| Recepción | `CoordinatorChat.tsx` | Layout wrapper |
| Rol display names | i18n map slug→rol | `agent-role-labels.ts` |

---

## Sistema visual

Extender `office-theme.css` y estética war room:

| Token | Uso |
|-------|-----|
| `--office-room-bg` | Fondo sala (gradiente sutil) |
| `--office-room-active` | Borde pulsante cuando dept tiene encargo activo |
| `--office-dept-strategy` | Estrategia |
| `--office-dept-engineering` | Ingeniería |
| `--office-dept-product` | Producto |
| `--office-dept-business` | Negocio |

**Tipografía:** mantener `--font-display` para títulos de sala; roles en sans semibold.

**Motion:** transición suave al entrar a sala (150ms); pulse en asiento `busy` (ya existe en war room).

---

## Fases de implementación

### Fase 1 — Quick wins (1–2 días)

- [x] Servicio “Analizar repositorio” en coordinador
- [x] Mapa slug → rol legible en UI (i18n, sin nombres de persona)
- [x] Link “Archivo” en nav de Oficina → `/office/archive`
- [x] Org units renombrados visualmente como “departamentos / salas” en copy

### Fase 2 — Planta básica (3–5 días)

- [x] `OfficeFloorPlan` con salas default + org units
- [x] Indicador busy/idle por sala (API `departments` en dashboard)
- [x] Vista departamento virtual (`/office/departments/:slug`)
- [x] Vista departamento unificada para org units custom (`/org-units/:id` usa `DepartmentRoomView`)

### Fase 3 — Hub documental (3–5 días)

- [x] `/office/archive` agregando encargos, workspace y artefactos
- [x] Filtros por departamento / producto / rol / origen
- [x] Preview lateral con `RichMarkdownView`

### Fase 5 — Procedimientos departamentales (Sprint 1–3, 2026-08)

- [x] Procedimientos agrupados por departamento (virtual y org unit)
- [x] Panel **Procedimientos del departamento** en salas (`DepartmentProceduresPanel`)
- [x] Encargos con contexto dept → procedimiento (lista, detalle, actividad dashboard)
- [x] Workflows / Equipo IA fuera del nav diario → **Configuración → Procedimientos / Plantilla de especialistas**
- [x] Ficha de especialista con encargos recientes (`SpecialistProfileModal`)
- [x] Filtro de encargos por departamento custom (org unit)
- [x] War room departamental con contexto dept/procedimiento
- [x] Sección documentos en ficha de especialista

---

- [x] War room a nivel departamento con contexto dept/procedimiento (`DepartmentWarRoomPanel`, APIs `/office/departments/:slug/team`, `/org-units/:id/team`)
- [x] Animaciones de handoff entre especialistas (`WarRoomHandoffOverlay` + SSE `step_start`)
- [x] Notificaciones «departamento listo» al terminar el último encargo activo (`department_run_completed`)
- [x] Sección documentos en ficha de especialista (archive por agente)
- [x] `currentAgentId` en shared memory para estado busy preciso en dashboard

---

## Decisiones de diseño

| Decisión | Elegido | Descartado |
|----------|---------|------------|
| Unidad mental | **Departamentos** | Personas famosas (Bezos…) |
| Vista default | **Planta** con dashboard colapsable | Dashboard KPI-first actual |
| Documentos | **Hub unificado** | Seguir buscando en debug/consensus |
| Repo analysis | **Servicio en recepción** | Solo vía Productos |
| Avatar | Emoji + gradiente por rol | Fotos / ilustraciones 3D (fase 4+) |

---

## Métricas de éxito

- Usuario encuentra un documento en **≤ 3 clicks** desde Planta
- Usuario lanza análisis de repo **sin crear producto** (opcional vincular después)
- Usuario identifica qué departamento está activo **sin abrir war room**
- Encuesta cualitativa: “¿Se siente como oficina?” ≥ 4/5 tras fase 2

---

## Referencias

- Motor actual: `src/lib/office-coordinator.ts`, `frontend/src/pages/OfficePage.tsx`
- War room (referencia visual): `frontend/src/components/war-room/WarRoomContent.tsx`
- Departamentos: `frontend/src/pages/OrgUnitsPage.tsx`, `OrgStudioPage.tsx`
- Mapa de navegación: [`office-navigation-map.md`](./office-navigation-map.md)
