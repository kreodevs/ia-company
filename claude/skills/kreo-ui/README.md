# kreo-ui

Skill de Cursor para integrar el design system **Kreo UI** vía MCP `user-kreo`.

## Contenido

| Archivo | Descripción |
|---------|-------------|
| [SKILL.md](./SKILL.md) | Instrucciones principales: workflows DEV y PROTOTYPE |
| [references/mcp-tools.md](./references/mcp-tools.md) | Catálogo de tools MCP |
| [references/prototype-spec.md](./references/prototype-spec.md) | Contrato UiProjectInstructions |
| [references/design-tokens.md](./references/design-tokens.md) | Tokens luxury/corporate resumidos |

## Cuándo se activa

El agente carga esta skill cuando la tarea involucra:

- Componentes Kreo (DynamicForm, DataTable, FlowEditor, etc.)
- Prototipos iframe con `generate_ui_project`
- Pull de componentes al repo local (`projects/`)
- Landings marketing con section types (hero, pricing, footer)
- Design tokens dark/gold Kreo

## Workflows

- **DEV** — código en repo del cliente: `pull_source_code_from_registry`
- **PROTOTYPE** — solo iframe: `generate_ui_project` en servidor Kreo

No mezclar ambos workflows en la misma sesión.

## Requisitos

- MCP `user-kreo` configurado y autenticado en Cursor
- Proyectos nuevos bajo `projects/` (regla del workspace Auto Company)
