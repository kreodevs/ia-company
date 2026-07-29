# Mapa de navegación — ¿Dónde voy para…?

> Guía rápida para operar Auto-Company sin perderte.  
> Piensa en **departamentos y encargos**, no en nombres de agentes.

---

## Regla de oro

```
Casi todo empieza en  Oficina (/office)  →  Coordinador  →  Encargos  →  Documentos
```

Si no sabes dónde ir, abre **Oficina** y describe qué necesitas.

---

## Por objetivo

### Quiero encargar trabajo nuevo

| Paso | Dónde | Ruta |
|------|-------|------|
| 1 | **Oficina** — chat del Coordinador | `/office` |
| 2 | Revisar plan (equipo, coste, tiempo) | mismo chat |
| 3 | Aprobar y ejecutar | botón «Aprobar y ejecutar» |
| 4 | Seguir en vivo | **War room** del producto (si aplica) |
| 5 | Recoger resultados | **Encargos** → detalle del encargo |

**Atajo:** servicios rápidos en Oficina (chips: mercado, validar idea, feature, repo…).

---

### Quiero analizar un repositorio de GitHub

| Situación | Dónde ir | Qué hacer |
|-----------|----------|-----------|
| **Sin producto creado** (rápido) | `/office` | Servicio **Analizar repositorio** → pega URL → aprueba |
| **Repo ya conectado a un producto** | `/office` | Selecciona producto en alcance → pide análisis al coordinador |
| **Primera vez con ese repo** | `/products` → crear/editar producto | Pega URL GitHub → intake automático → luego encargo desde Oficina |
| **Ver código clonado** | `/products/:id/code` | Árbol de archivos del workspace |

**Token GitHub:** Configuración → Integraciones (necesario para repos privados).

---

### Quiero ver documentos / informes

| Qué buscas | Dónde | Ruta |
|------------|-------|------|
| Entregables de un encargo concreto | **Encargos** → detalle | `/office/encargos/:runId` |
| **Todo en un solo lugar** | **Archivo de la oficina** | `/office/archive` |
| Memoria estratégica de un producto | Producto → Consenso | `/products/:id/consensus` |
| Informes por rol/agente | Consenso → pestaña informes | mismo |
| Archivos que generaron agentes | Producto → Código | `/products/:id/code` |
| Artefactos de un departamento | Departamento → galería | `/org-units/:id` |
| Consenso de toda la empresa | Depuración → Consenso | `/debug/consensus` |

> **Próximo:** hub unificado en `/office/archive` (ver [diseño](./virtual-office-design.md)).

---

### Quiero ver al equipo trabajando en vivo

| Contexto | Dónde | Ruta |
|----------|-------|------|
| Encargo activo con producto | **War room** | `/war-room/:productId` |
| Estado global (dots) | Oficina → panel «Tu equipo» | `/office` |
| Mesa táctica (agentes en círculo) | War room | solo mientras hay run activo |
| Logs técnicos del run | Depuración → Runs → detalle | `/debug/runs/:id` |

**Importante:** la war room es **por producto**. Sin producto en alcance, sigue el encargo en **Encargos** y notificaciones.

---

### Quiero organizar por departamentos

| Objetivo | Dónde | Ruta |
|----------|-------|------|
| Ver departamentos | **Departamentos** | `/org-units` |
| Crear departamento (plantilla) | **Org Studio** | `/org-studio` |
| Encargo scoped a un dept | Oficina → selector departamento | `/office` |
| Agentes del departamento | Detalle departamento | `/org-units/:id` |

Los departamentos definen **agentes sugeridos, estilo y pipeline de artefactos** — es la unidad organizativa correcta.

---

### Quiero configurar agentes y habilidades

| Qué | Dónde | Ruta |
|-----|-------|------|
| Catálogo de agentes | **Equipo IA** | `/ai-team` |
| Crear agente | Equipo IA → Crear | `/ai-team?tab=create-agent` |
| Skills | Equipo IA → Skills | `/ai-team` (tab skills) |
| Workflows reutilizables | **Workflows** | `/office/workflows` |

---

### Quiero conectar un producto / oportunidad

| Paso | Dónde | Ruta |
|------|-------|------|
| Portfolio | **Productos** | `/products` |
| Detalle + desk | Producto | `/products/:id/desk` |
| Conectar GitHub | Producto → configuración | settings del producto |
| Lanzar playbook (SEO, review…) | War room o desk | `/war-room/:id` |

---

### Quiero programar tareas automáticas

| Qué | Dónde | Ruta |
|-----|-------|------|
| Reglas de calendario | **Configuración → Orquestación** | `/settings` |
| Workflows disponibles | Workflows | `/office/workflows` |

Modo por defecto: **bajo demanda** (nada corre sin tu OK).

---

### Quiero tomar una decisión GO/NO-GO

| Dónde | Ruta |
|-------|------|
| Notificación en Oficina | `/office` → actividad |
| Encargo con propuesta | `/office/encargos/:runId` → panel decisión |
| Depuración decisiones | `/debug/decisions` |

---

## Diagrama — Flujo completo

```mermaid
flowchart TD
  Start([Entro a la app]) --> Office[/office Oficina]
  Office --> Chat[Coordinador: describo encargo]
  Chat --> Plan[Reviso plan y alcance]
  Plan --> Approve{Aprobar?}
  Approve -->|No| Chat
  Approve -->|Sí| Run[Encargo en ejecución]
  Run --> WR{¿Producto en alcance?}
  WR -->|Sí| WarRoom[/war-room War room en vivo]
  WR -->|No| Encargos[/office/encargos Lista]
  WarRoom --> Encargos
  Run --> Encargos
  Encargos --> Docs[Documentos e informe final]
  Docs --> Archive[Archivo / Consenso producto]

  Office --> Dept[/org-units Departamentos]
  Dept --> Office

  Office --> Repo[Chip Analizar repo]
  Repo --> Plan

  Products[/products Productos] --> Intake[Intake GitHub]
  Intake --> Office
```

---

## Rutas de referencia rápida

| Ruta | Nombre en UI | Para qué |
|------|--------------|----------|
| `/office` | Oficina | Pedir trabajo, KPIs, coordinador |
| `/office/encargos` | Encargos | Inbox de trabajos terminados/en curso |
| `/office/encargos/:id` | Detalle encargo | Informes y documentos |
| `/office/archive` | Archivo | Hub documental unificado |
| `/office/workflows` | Workflows | Secuencias reutilizables |
| `/war-room/:productId` | War room | Vista táctica en vivo |
| `/products` | Productos | Portfolio |
| `/products/:id/code` | Código | Archivos del workspace |
| `/products/:id/consensus` | Consenso | Memoria del producto |
| `/org-units` | Departamentos | Equipos virtuales |
| `/org-studio` | Org Studio | Crear departamentos |
| `/ai-team` | Equipo IA | Agentes y skills |
| `/settings` | Configuración | Límites, integraciones, schedules |
| `/help/guia-completa` | Ayuda | Manual completo |

---

## Cuando te sientes perdido

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| «No veo empleados» | Oficina muestra dots, no salas | Ve a War room durante un encargo; crea departamentos en Org Studio |
| «No encuentro el informe» | Documentos ligados al encargo | `/office/encargos` → último completado → pestaña Documentos |
| «Analicé un repo y no pasó nada» | Falta aprobar el plan | Oficina → proponer equipo → aprobar |
| «War room vacía» | No hay run activo o sin producto | Lanza encargo con producto en alcance |
| «Todo parece técnico / agentes» | UI usa slugs | Piensa en departamentos; próximo: roles legibles en UI |

---

## Relacionado

- [Diseño oficina virtual](./virtual-office-design.md) — wireframes y roadmap UX
- [Manual de usuario](/help/guia-completa) — guía paso a paso en la app
- [`docs/GAPS.md`](../GAPS.md) — brechas técnicas conocidas
