# Guía — Departamentos

Crear departamentos con Org Studio, `design.md`, tokens, galería y plantilla de personal.

---

## Tabla de contenidos

1. [Dos tipos de «departamento»](#dos-tipos-de-departamento)
2. [Salas virtuales vs Org Units](#salas-virtuales-vs-org-units)
3. [Org Studio](#org-studio)
4. [Pestaña Personal (staff)](#pestaña-personal-staff)
5. [design.md y tokens](#designmd-y-tokens)
6. [Galería de artefactos](#galería-de-artefactos)
7. [Plantillas de negocio](#plantillas-de-negocio)
8. [Preguntas frecuentes](#preguntas-frecuentes)

---

## Dos tipos de «departamento»

| Tipo | Dónde | Qué es |
|------|-------|--------|
| **Salas virtuales** | Plano de la Oficina (Strategy, Product, Engineering…) | Agrupación visual de agentes de plataforma — no tienen `design.md` propio |
| **Org Units** | **Departamentos** (`/org-units`) creados en Org Studio | Departamentos reales con marca, agentes, work items y galería |

Esta guía cubre los **Org Units** en detalle y contrasta con las salas virtuales.

---

## Salas virtuales vs Org Units

```mermaid
flowchart TB
  subgraph virtual [Salas virtuales]
    V1["/office/departments/strategy"]
    V2["/office/departments/engineering"]
  end
  subgraph org [Org Units]
    O1["/org-units/:id"]
    O2[Org Studio]
  end
  FP[Plano Oficina] --> virtual
  FP -->|Crear en Org Studio| O2
  O2 --> O1
```

| Aspecto | Sala virtual | Org Unit |
|---------|--------------|----------|
| Ruta | `/office/departments/:slug` | `/org-units/:id` |
| Origen | Plano fijo de la Oficina | Creado en Org Studio |
| `design.md` | No | Sí — sincronizado a `projects/_org/{slug}/` |
| Galería de artefactos | No | Sí |
| Pestaña Personal | No | Sí — roster y contratación |
| Procedimientos dept. | Lista procedimientos de plataforma del área | Procedimientos vinculados al Org Unit |

Para pedir trabajo con contexto de marca real, usa un **Org Unit**. Las salas virtuales sirven para explorar agentes de plataforma por disciplina (estrategia, ingeniería, etc.).

---

## Org Studio

Ruta: **Departamentos** (`/org-units`) → botón **Abrir Org Studio** (`/org-studio`). También accesible desde el plano de la Oficina («Crear en Org Studio»).

```mermaid
flowchart TD
  A[Plantilla + misión] --> B[Generar propuesta]
  B --> C[Revisar agentes y skills faltantes]
  C --> D{Munger VETO?}
  D -->|Sí| A
  D -->|No| E[Aprobar skills nuevas]
  E --> F[Crear departamento]
  F --> G[Sync design.md + tokens]
  F --> H[Opcional: work item inicial]
```

Pasos en la UI:

1. Elige plantilla, nombre y misión → **Generar propuesta**.
2. Revisa agentes sugeridos, config y revisión Munger.
3. Marca checkboxes de **skills nuevas** que apruebas crear.
4. **Crear departamento** — redirige a `/org-units/:id`.

Si Munger emite VETO, no puedes aplicar hasta ajustar la propuesta.

---

## Pestaña Personal (staff)

Ruta: ficha del departamento → pestaña **Personal** (`/org-units/:id?tab=staff`).

Gestiona el **roster** de agentes asignados al Org Unit:

| Sección | Función |
|---------|---------|
| **Miembros actuales** | Nombre, rol, estado (idle/busy en vivo), si está provisionado en plantilla |
| **Vacantes** | Puestos definidos en la plantilla del dept. sin agente creado aún |
| **Contratar** | Modo *Crear puesto* — brief a Catalog Studio para nuevo agente |
| **Incorporar** | Vincular agente existente de la plantilla al departamento |
| **Desvincular** | Quitar agente del roster sin borrarlo del tenant |

Sub-pestañas **Contratar / Incorporar** vía `?tab=staff&hire=create` o `hire=incorporate`.

Desde vacantes puedes lanzar briefs pre-rellenados («contratar copy-manager para departamento X»). Tras crear el agente, vuelve a Personal para confirmar que aparece como **provisionado**.

> Contratar agentes IA en detalle: [/help/guia-equipo-ia](/help/guia-equipo-ia).

---

## design.md y tokens

Cada Org Unit tiene:

| Activo | Uso |
|--------|-----|
| **design.md** | Voz, colores, reglas de entregables — lo leen los agentes del dept. |
| **tokens** (JSON DTCG) | Colores, tipografía, spacing organizacionales |
| **config** | Nicho, canales, cadencia, voz de marca (según plantilla) |

Se sincroniza a `projects/_org/{slug}/design.md`. Los agentes de marketing/copy/diseño **deben referenciar** estos tokens, no inventar paletas en JSON paralelo.

Edita perfil operativo y diseño en la ficha del departamento → pestaña **Configuración** → subsecciones *Operating profile* y *Design & artifacts*.

---

## Galería de artefactos

Ruta: departamento → **Configuración** → **Design & artifacts** (componente `ArtifactGallery`).

- Entregables tipados: `copy`, `design`, `social_post`, `report`, `code`, …
- Filtrar por estado: borrador, aprobado, publicado
- Origen: output de runs completados con producto vinculado al departamento

La sala del departamento (pestaña **Sala**) también muestra artefactos recientes en el panel lateral.

---

## Plantillas de negocio

Plantillas de plataforma (slug → nombre en UI):

| Slug | Nombre |
|------|--------|
| `marketing-agency` | Digital Marketing Agency |
| `product-studio` | Product Studio (default) |
| `sales-revops` | Sales & RevOps |
| `customer-success` | Customer Success |
| `seo-content-studio` | SEO & Content Studio |
| `finance-pricing` | Finance & Pricing |
| `customer-support` | Customer Support |
| `custom-department` | Custom Department |

La plantilla **Marketing agency** sugiere agentes como `copy-manager`, `community-manager`, `design-lead`, `marketing-strategist` y skills de contenido/diseño.

Al aplicar la plantilla, aprueba cada agente/skill nuevo que aún no exista en tu tenant (Catalog Studio o checkboxes en Org Studio).

Desde `/org-units/:id` puedes **lanzar trabajo del departamento** con tarea libre + producto vinculado opcional.

---

## Preguntas frecuentes

### ¿Las salas del plano (Strategy, Engineering…) son Org Units?

No. Son **salas virtuales** en `/office/departments/:slug`. Los Org Units reales se crean en Org Studio y aparecen en **Departamentos** (`/org-units`).

### ¿Puedo editar design.md sin Org Studio?

Sí — ficha del departamento → **Configuración** → *Design & artifacts*. Los cambios se sincronizan al workspace `projects/_org/{slug}/`.

### ¿Personal vs Plantilla de especialistas?

**Personal** (`/org-units/:id?tab=staff`) — qué agentes pertenecen a *este* departamento. **Plantilla de especialistas** (`/settings/specialists`) — catálogo global de agentes del tenant.
