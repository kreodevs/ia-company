# Kreo MCP — Tools Reference

Servidor: `user-kreo`. Siempre `GetMcpTools` antes de `CallMcpTool`.

## Discovery & metadata

| Tool | Args | Retorna |
|------|------|---------|
| `ping_mcp` | — | Health check |
| `get_ui_component_catalog` | — | 129 componentes: tier, layer, importPath, description, whenToUse, sectionTypes |
| `list_semantic_registry` | — | ~80 entidades con props requeridas y rationale |
| `resolve_component_for_entity` | `{ entity: string }` | component_name, path, required_props, rationale |
| `get_component_metadata` | `{ name: string }` | Props, semantic hints, field_types, nextSteps |
| `get_component_api` | `{ componentName }` | Quick Start + API Specs (docs atómicas) |
| `search_docs` | `{ query }` | Búsqueda en docs_mcp (si DOCS_MCP_ROOT configurado) |

## DEV — pull & setup

| Tool | Args | Notas |
|------|------|-------|
| `pull_source_code_from_registry` | `{ name: string }` | **Un componente por llamada** |
| `get_dependencies_for_components` | `{ names: string[] }` | Solo deps de esos componentes |
| `pull_design_md` | — | DESIGN.md completo (tokens, reglas) |
| `pull_registry_theme_css` | — | vars.css / tema |
| `pull_registry_utils_code` | — | cn(), helpers |
| `pull_registry_tailwind_config` | — | tailwind.config extend |
| `pull_tokens_dtcg` | — | Tokens DTCG export |
| `upgrade_component` | `{ name, targetVersion? }` | Actualizar componente ya integrado |
| `inspect_registry_theme_config` | — | Config tema registry |

## DEV — FlowEditor backend

| Tool | Args |
|------|------|
| `get_workflow_backend_contract` | — |
| `get_workflow_backend_example` | `{ preset: "crm" \| ... }` |

## PROTOTYPE — spec → iframe

| Tool | Args |
|------|------|
| `get_ui_project_contract` | — |
| `get_ui_project_instructions_schema` | — |
| `get_ui_section_type_registry` | — |
| `get_ui_project_example` | `{ name: "minimal" \| "app-shell" \| "landing" }` |
| `validate_ui_project_instructions` | `{ instructions: object }` |
| `generate_ui_project` | `{ instructions: object }` |
| `get_ui_project_status` | `{ slug }` |
| `list_ui_project_screens` | `{ slug }` |
| `get_ui_embed_url_format` | — |
| `validate_ui_project_instructions` | — |

## Governance (opcional)

| Tool | Uso |
|------|-----|
| `bootstrap_ui_governance` | Contrato UI proyecto cliente |
| `get_ui_project_contract` | Schema instrucciones |
| `fetch_remote_registry_components` | Resumen legacy — no usar con detail:"full" para pull masivo |

## Prohibidos / evitar

- `get_registry_dependencies` → instala todo el registry
- `fetch_remote_registry_components({ detail: "full" })` + pull masivo
- `pull_source_code_from_registry` en workflow PROTOTYPE
- `generate_ui_project` en workflow DEV
