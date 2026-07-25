# Equipo IA (`/ai-team`)

Hub del catálogo tenant: agentes, habilidades y **Catalog Studio** con LLM.

## Ruta

| Path | Componente |
|------|------------|
| `/ai-team` | `AiTeamHubPage` — tab Agentes (default) |
| `/ai-team?tab=skills` | Listado + edición manual de skills |
| `/ai-team?tab=create-agent` | Agent Studio (propose → aprobación humana → apply) |
| `/ai-team?tab=create-skill` | Skill Studio |

Redirects legacy: `/agents`, `/skills`, `/debug/agents`, `/debug/skills` → `/ai-team`.

## Flujo Catalog Studio

1. **Propose** — LLM propone reutilizar existente o draft nuevo (solo catálogo del tenant).
2. **Munger** — pre-mortem automático; VETO bloquea apply.
3. **Apply** — requiere `approved: true` explícito del humano; skills nuevas en agente requieren checkbox por nombre.

API: `POST /api/catalog-studio/{skills|agents}/propose|apply`.

## Componentes

- `AiTeamHubPage.tsx` — tabs + embed de `AgentsPage` / `SkillsPage`
- `components/catalog-studio/CatalogStudioAgentPanel.tsx`
- `components/catalog-studio/CatalogStudioSkillPanel.tsx`
- `components/catalog-studio/MungerReviewPanel.tsx`

## i18n

Claves bajo `catalogStudio.*` en `frontend/src/i18n/locales/{es,en}/catalogStudio.ts`.
