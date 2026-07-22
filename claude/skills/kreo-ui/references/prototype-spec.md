# Kreo PROTOTYPE — UiProjectInstructions

Schema: `get_ui_project_instructions_schema`. Validar siempre antes de `generate_ui_project`.

## Estructura raíz

```json
{
  "version": "1.0.0",
  "project": {
    "slug": "mi-proyecto",
    "name": "Mi Proyecto",
    "description": "opcional"
  },
  "constraints": {
    "allowMarketing": false,
    "maxScreensPerRequest": 24
  },
  "context": {
    "brand": { "systemName": "Kreo", "theme": "marketing-light" },
    "navigation": { "items": [] },
    "theme": { "mode": "dark", "preset": "luxury" }
  },
  "screens": [],
  "output": {
    "mode": "sync",
    "storybook": {
      "baseUrl": "http://localhost:6006",
      "embed": { "viewMode": "story", "globals": { "theme": "marketing-light" } }
    }
  }
}
```

## Screen

```json
{
  "key": "dashboard",
  "title": "Dashboard",
  "useCase": {
    "id": "UC-001",
    "name": "Ver métricas",
    "mainFlow": ["Abrir", "Filtrar", "Exportar"]
  },
  "ui": {
    "intent": "dashboard",
    "layout": "app-shell",
    "sections": []
  },
  "states": [{ "key": "default", "description": "Estado normal" }]
}
```

### ui.intent

`form-with-validation` · `dashboard` · `list-detail` · `wizard` · `settings` · `empty-landing` · `app-shell` · `centered`

### ui.layout

`app-shell` · `centered` · `fullscreen` · `plain` · `landing` (marketing full-bleed)

## Sections por type

### App (generan JSX)

| type | required | opcionales |
|------|----------|------------|
| `page-header` | title | description, breadcrumbs, actions |
| `dynamic-form` | fields | sections, actions |
| `data-table` | — | columns, title |
| `stats-row` | — | items |
| `chart-panel` | — | chartType, title |
| `empty-state` | title | description |
| `filter-bar` | — | filters |
| `wizard-step` | — | steps, currentStep |
| `role-flags` | — | flags, layout |
| `permissions-matrix` | permissions, value | roleCode, groups |
| `file-upload` | — | accept, multiple |
| `description-list` | — | items |
| `timeline` | — | events |
| `kanban` | — | columns |
| `markdown-content` | — | value, readOnly, showSourceView |
| `dialog-action` | — | actions |
| `toast-feedback` | — | — |

### Marketing (requiere `allowMarketing: true`)

| type | required | componentes |
|------|----------|-------------|
| `hero` | title | HeroModern, HeroSection |
| `feature-grid` | — | FeatureGrid |
| `pricing` | — | PricingModern, PricingCards |
| `testimonials` | — | TestimonialsSlider |
| `cta` | title | CTASection |
| `footer` | — | FooterModern, Footer |

### Escape hatches

**`component`** — cualquier nombre del catálogo:

```json
{
  "id": "nav",
  "type": "component",
  "component": "Navbar",
  "props": {
    "links": [{ "label": "Producto", "href": "#features" }],
    "cta": { "label": "Empezar", "href": "#cta" }
  }
}
```

**`custom`** — solo guía textual:

```json
{
  "id": "x",
  "type": "custom",
  "promptFragment": "Tabla pivot con drill-down por región"
}
```

## Plantillas listas

Usar `get_ui_project_example`:

- `minimal` — pantalla app simple
- `app-shell` — layout con navegación
- `landing` — marketing completo (hero → footer)

## Post-generación

1. Respuesta: `iframeUrl`, `generationMode: "server-only"`, `clientMustNotWriteFiles: true`
2. `list_ui_project_screens({ slug })` para todas las URLs
3. No replicar archivos en repo del cliente
