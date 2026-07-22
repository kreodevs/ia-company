---
name: kreo-ui
description: >-
  Integra componentes Kreo UI vía MCP user-kreo: catálogo de 129 componentes,
  design tokens luxury/corporate, workflows DEV (pull local) y PROTOTYPE (iframe
  Storybook). Usar cuando el usuario pida Kreo, componentes del design system,
  DynamicForm, DataTable, FlowEditor, landings marketing, prototipos embebibles,
  pull de componentes, generate_ui_project, o UI corporativa dark/gold.
argument-hint: "[componente, pantalla o workflow DEV|PROTOTYPE]"
license: MIT
metadata:
  author: auto-company
  version: "1.0.0"
  mcp_server: user-kreo
---

# Kreo UI — MCP Components Skill

Design system **Kreo Luxury/Corporate**: PrimeReact headless + Tailwind + CSS variables. Oro `#C9A227` sobre charcoal `#0A0A0A`. Catálogo: **129 componentes generables**.

**MCP:** `user-kreo` — invocar con `CallMcpTool` tras `GetMcpTools`.

## Regla de oro

Elige **UN** workflow por sesión. **Nunca mezclar** DEV y PROTOTYPE.

| Objetivo | Workflow | Resultado |
|----------|----------|-----------|
| App local en `projects/` del cliente | **DEV** | Código en repo + deps npm |
| Prototipo / demo / iframe embebible | **PROTOTYPE** | Solo `iframeUrl` del servidor |

---

## Decisión rápida

```
¿Integrar UI en código del proyecto?
  SÍ → DEV
  NO, solo preview/embeber → PROTOTYPE

¿Landing marketing (hero, pricing, footer)?
  DEV → pull HeroModern, PricingCards, etc.
  PROTOTYPE → spec con allowMarketing: true + section types marketing

¿FlowEditor o DocumentDesigner?
  DEV obligatorio + backend propio (handlers / TipTap extensions)
```

---

## WORKFLOW A — DEV (app local)

Integrar componentes en el repo del cliente bajo `projects/`.

### Bootstrap (una vez por proyecto)

```text
1. pull_design_md              → tokens y reglas visuales
2. pull_registry_theme_css     → vars.css / tema Kreo
3. pull_registry_utils_code    → utilidades compartidas (cn, etc.)
4. pull_registry_tailwind_config → tailwind extend Kreo
```

### Por componente (secuencia estricta)

```text
1. resolve_component_for_entity({ entity: "..." })
   └─ fallback: get_ui_component_catalog + get_component_metadata({ name })
2. get_component_metadata({ name })   → props, field_types, nextSteps
3. pull_source_code_from_registry({ name })   ← UN componente por llamada
4. get_dependencies_for_components({ names: ["Name"] })
5. npm install solo paquetes devueltos en paso 4
```

### Convenciones DEV

| Regla | Valor |
|-------|-------|
| Import path | `@/components/{layer}/{Name}` — ver `importPath` del catálogo |
| Capas | `atoms` · `molecules` · `organisms` · `templates` |
| Barrel | **No** asumir `@/components/ui` — usar path del catálogo |
| Deps masivas | **Prohibido** `get_registry_dependencies` |
| Fetch masivo | **Prohibido** `fetch_remote_registry_components` con `detail: "full"` |
| Destino código | Repo del **cliente**, nunca `src/stories/**` del registry Kreo |

### Selección semántica de componente

Prioridad:

1. `resolve_component_for_entity({ entity: "tabla de usuarios" })` → ~80 entidades mapeadas
2. `list_semantic_registry` → props requeridas y rationale
3. `get_ui_component_catalog` → `description` + `whenToUse` antes de pull

**Mapeo frecuente:**

| Entidad / necesidad | Componente |
|---------------------|------------|
| Listado tabular CRUD | `DataTable` |
| Grid editable inline | `EditableDataGrid` |
| Formulario CRUD | `DynamicForm` |
| Pipeline / etapas | `KanbanBoard` |
| Automatizaciones visuales | `FlowEditor` |
| Plantillas documento | `DocumentDesigner` |
| Dashboard KPIs | `DashboardModern` + `DashboardKPI` |
| Shell app | `AppLayout` + `SidebarModern` |
| Landing hero | `HeroModern` |
| Permisos por rol | `PermissionsMatrix` |
| Sin match claro | `Card` (fallback semántico) |

### Componentes avanzados

**FlowEditor** — tras pull:

```text
get_workflow_backend_contract
get_workflow_backend_example({ preset: "crm" })
→ Implementar API REST + handler registry en backend del proyecto
```

Persistir `{ nodes, edges }` de `@xyflow/react`. Handlers por `data.action` (`send_email`, etc.). Plantillas `{{ticket.title}}`.

**DocumentDesigner** — shell TipTap v3; extensiones, bloques y PDF viven en la app (mismo patrón preset + backend que FlowEditor).

---

## WORKFLOW B — PROTOTYPE (iframe)

Genera pantallas **solo en servidor Kreo** (`src/proyectos/{slug}/`). Cliente **no escribe archivos**.

### Secuencia

```text
1. get_ui_project_contract
2. get_ui_component_catalog
3. get_ui_section_type_registry
4. get_ui_project_example({ name: "minimal" | "app-shell" | "landing" })
5. validate_ui_project_instructions({ instructions: spec })
6. generate_ui_project({ instructions: spec })
7. Usar iframeUrl de la respuesta (generationMode: server-only)
8. list_ui_project_screens — recuperar URLs después
```

### Reglas PROTOTYPE

- **Nunca** `pull_source_code_from_registry`
- **Nunca** crear archivos UI en repo del cliente
- Respuesta incluye `clientMustNotWriteFiles: true`
- Marketing: `constraints.allowMarketing: true` + `ui.layout: "landing"`

### Section types (vocabulario `sections[].type`)

| Type | Uso |
|------|-----|
| `page-header` | Título, breadcrumbs, acciones |
| `dynamic-form` | Formularios declarativos |
| `data-table` | Listados |
| `stats-row` | KPIs |
| `chart-panel` | Gráficas Recharts |
| `filter-bar` | Filtros avanzados |
| `wizard-step` | Asistente multipaso |
| `hero` · `feature-grid` · `pricing` · `testimonials` · `cta` · `footer` | Marketing |
| `component` | Escape hatch: `component: "NombreExacto"` + `props` |
| `custom` | Solo `promptFragment` — revisión manual |

Layout app: `ui.layout: "app-shell"` + `context.navigation` — **no** section `app-shell`.

Ver spec completo: [references/prototype-spec.md](references/prototype-spec.md)

---

## Editores de contenido

| Componente | Output | Cuándo |
|------------|--------|--------|
| `MarkdownEditorWysiwyg` | markdown GFM | CMS, emails, marketing, usuarios no técnicos |
| `MarkdownEditor` | markdown GFM | Devs, docs; preview con bloques mermaid |
| `MermaidEditor` | Mermaid DSL | Diagramas standalone |
| `MermaidDiagram` | SVG read-only | Embed en ReactMarkdown |
| `RichTextEditor` | HTML | ⚠️ Deprecated — solo legacy |

DynamicForm: `richtext` → WYSIWYG markdown · `html-richtext` → RichTextEditor legacy.

---

## Design tokens (obligatorio en DEV)

- **Dark-first**; light con clase `.light` en `html`/`body`
- Colores/spacing/radii **solo** CSS variables (`--primary`, `--radius-md`, etc.)
- **No** hardcodear `#C9A227`, `text-zinc-*`, `rounded-lg` de Tailwind
- Usar `rounded-[var(--radius-md)]`, iconos **Lucide** (no PrimeIcons)
- Touch targets mínimo **44×44px**
- Toasts nuevos: `Sonner` preferido sobre `Toast`

Detalle tokens: output de `pull_design_md` o [references/design-tokens.md](references/design-tokens.md)

---

## DynamicForm — tipos de campo

`text` · `email` · `password` · `number` · `currency` · `textarea` · `select` · `multiselect` · `checkbox` · `switch` · `file` · `richtext` · `html-richtext` · `tags` · `color` · `rating` · `date` · `role-flags`

Variantes: `default` | `premium` | `glass`. Layout 12 columnas vía `colSpan`. Validación Zod auto-generada.

---

## Checklist pre-entrega DEV

```text
- [ ] Componentes pulled uno a uno con importPath correcto
- [ ] Deps instaladas vía get_dependencies_for_components (no masivo)
- [ ] Theme CSS + utils copiados en bootstrap
- [ ] Sin colores/radii hardcodeados
- [ ] FlowEditor/DocumentDesigner: backend implementado si aplica
- [ ] README de la carpeta del feature actualizado
```

## Checklist pre-entrega PROTOTYPE

```text
- [ ] validate_ui_project_instructions pasó
- [ ] iframeUrl entregado al usuario
- [ ] No archivos UI creados en repo cliente
- [ ] allowMarketing si hay sections marketing
```

---

## Anti-patterns

| ❌ Prohibido | ✅ Correcto |
|-------------|------------|
| Mezclar DEV + PROTOTYPE en misma sesión | Elegir uno al inicio |
| `get_registry_dependencies` | `get_dependencies_for_components({ names: [...] })` |
| Pull de todo el catálogo | Pull solo componentes resueltos |
| `generate_ui_project` en DEV | `pull_source_code_from_registry` |
| Escribir `.stories.tsx` en cliente PROTOTYPE | Solo embeber iframeUrl |
| Inventar props sin metadata | `get_component_metadata` primero |

---

## MCP tools — referencia rápida

| Tool | Workflow | Propósito |
|------|----------|-----------|
| `get_ui_component_catalog` | Ambos | Catálogo + importPath |
| `resolve_component_for_entity` | DEV | Match semántico entidad→componente |
| `get_component_metadata` | DEV | Props, field_types, nextSteps |
| `pull_source_code_from_registry` | DEV | Código fuente (1 componente) |
| `get_dependencies_for_components` | DEV | npm deps precisas |
| `pull_design_md` | DEV | DESIGN.md tokens |
| `pull_registry_theme_css` | DEV | CSS variables |
| `pull_registry_utils_code` | DEV | Utilidades |
| `get_ui_project_contract` | PROTOTYPE | Contrato spec |
| `get_ui_section_type_registry` | PROTOTYPE | Vocabulario sections |
| `get_ui_project_example` | PROTOTYPE | JSON plantilla |
| `validate_ui_project_instructions` | PROTOTYPE | Validar antes de generar |
| `generate_ui_project` | PROTOTYPE | Generar en servidor |
| `list_ui_project_screens` | PROTOTYPE | URLs post-generación |
| `get_workflow_backend_contract` | DEV+FlowEditor | API + motor ejecución |
| `search_docs` / `get_component_api` | Ambos | Docs atómicas (si disponible) |

Lista completa: [references/mcp-tools.md](references/mcp-tools.md)

---

## Ejemplo DEV mínimo

```tsx
import { DynamicForm } from "@/components/organisms/DynamicForm";
import { Button } from "@/components/atoms/Button";

<DynamicForm
  sections={[{
    id: "main",
    title: "Nuevo lead",
    fields: [
      { name: "name", type: "text", label: "Nombre", required: true, colSpan: 6 },
      { name: "email", type: "email", label: "Email", required: true, colSpan: 6 },
    ],
  }]}
  onSubmit={(data) => console.log(data)}
  variant="premium"
  submitText="Guardar"
/>
```

## Ejemplo PROTOTYPE mínimo

```json
{
  "version": "1.0.0",
  "project": { "slug": "demo-crm", "name": "Demo CRM" },
  "screens": [{
    "key": "leads",
    "title": "Leads",
    "ui": {
      "intent": "list-detail",
      "layout": "app-shell",
      "sections": [
        { "id": "hdr", "type": "page-header", "title": "Leads" },
        { "id": "tbl", "type": "data-table", "title": "Listado" }
      ]
    }
  }]
}
```

Tras `generate_ui_project` → entregar `iframeUrl` al usuario.
