# Equipo IA (`/settings/specialists`)

Hub de plantillas de especialistas (agentes y skills) con Catalog Studio integrado.

## Rutas

| Ruta | Contenido |
|------|-----------|
| `/settings/specialists` | `AiTeamHubPage` — tab Agentes (default) |
| `/settings/specialists?tab=skills` | Listado + edición manual de skills |
| `/settings/specialists?tab=create-agent` | Agent Studio (propose → aprobación humana → apply) |
| `/settings/specialists?tab=create-skill` | Skill Studio |

Redirects legacy: `/ai-team`, `/agents`, `/skills`, `/debug/agents`, `/debug/skills` → `/settings/specialists`.

## UX (auditoría P4)

- `PageHeader` con `Breadcrumbs` (Settings → Specialist templates)
- `TabsBar` con prop `sticky` para navegación entre tabs al hacer scroll
- Tabs **Agentes** / **Habilidades** embeden `AgentsPage` / `SkillsPage` con `embedded`
- Tabs **Crear agente** / **Crear habilidad** usan `CatalogStudioAgentPanel` / `CatalogStudioSkillPanel` (Panel Kreo)

## Archivos

- `AiTeamHubPage.tsx` — tabs + embed de páginas hijas

Claves i18n bajo `catalogStudio.*` en `frontend/src/i18n/locales/{es,en}/catalogStudio.ts`.
