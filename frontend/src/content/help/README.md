# Help content

User-facing manuals for the in-app **Ayuda / Help** section (`/help`).

## Languages

Each article has Spanish (`*.md`) and English (`*.en.md`) bodies. Title and description switch via `getHelpArticles(lang)` in `index.ts`.

## Articles

| Slug | ES title | Topic |
|------|----------|-------|
| `guia-completa` | Manual de usuario | Hub: inicio rápido + mapa + FAQ (no duplica guías) |
| `guia-oficina` | Oficina y encargos | Coordinator, dept./product scope, jobs, war room, archive |
| `guia-productos` | Productos | Phases, product consensus (`/debug/products/:id/consensus`), desk |
| `guia-departamentos` | Departamentos | Virtual rooms vs Org Studio, design.md, gallery in Settings |
| `guia-equipo-ia` | Equipo IA y habilidades | `/ai-team` tabs, Catalog Studio, manual New agent |
| `guia-flujos` | Flujos y programaciones | `/office/workflows`, Settings → Schedules, GO/NO-GO |
| `guia-operaciones` | Operaciones | `/ops` KPIs, scheduled activities, 7-day preview, skip reasons |
| `como-construir-agentes` | ¿Cómo construir agentes? | System prompt + consensus JSON handoff |
| `handoffs` | Handoffs y flujo | Parsed fields, disk/org artifacts, UI diagnosis codes |

Default route: `/help` → `/help/guia-completa`.

## Navigation notes (for authors)

- **Debug office section** (sidebar `nav.sectionDebugOffice`): Runs, Consensus, Ops, Decisions — tenant admins also see Team and Settings here.
- **Product consensus** route: `/debug/products/:productId/consensus` (not under Products in main nav).
- **Tenant login** redirects to `/ops`; Office home is `/office` (sidebar **Inicio** / **Home**).
- **Decisions** also at `/decisions` (alias of debug route).
- **Schedule rules:** only `fixed` workflow — API rejects new `meta_dynamic` (400). Legacy Meta rules may still display in Ops.

## Mermaid in preview

Help sections render through `MarkdownDoc`, which supports fenced ` ```mermaid ` blocks (same stack as `RichMarkdownView` → `MermaidDiagram`).

## Markdown stack vs TanStack Markdown

We use **react-markdown + remark-gfm + mermaid** for help articles:

- Static, versioned markdown in the repo — no streaming reparsing needed.
- Mermaid and chart blocks already integrated elsewhere in the app.

[TanStack Markdown](https://tanstack.com/markdown/latest) (alpha) targets parse-once AST + optional streaming AI output. It would add a dependency and migration cost without clear benefit for fixed help docs. Revisit if we stream agent documentation live into the UI.

## Adding an article

1. Create `your-article.md` and `your-article.en.md` (GFM + optional mermaid).
2. Register in `HELP_ARTICLE_REGISTRY` inside `index.ts`.
3. Add EN title/description to `EN_TITLES` if slug differs from ES copy.

Sidebar: each `##` / `###` becomes a section panel (`HelpPage` + `lib/markdown-sections.ts`).

**Mobile / tablet:** a horizontal **Guías por tema** chip strip (below quick links) lists every article without expanding the sidebar accordion. The sidebar list stays expanded by default on small screens.

**Mobile / iPad (< 1024px):** Help icon (book) in the top bar next to notifications. On `HelpPage`, **Artículos** and **En este artículo** are collapsible toggles (collapsed by default); document content renders first. Desktop: always-expanded sidebar.

## Scope

Non-technical **operator** documentation only — no Docker, worker CLI, or API setup. Code paths may be named sparingly when they clarify behavior (e.g. workflow slugs).

## Verification

When updating help, trace behavior in:

- `frontend/src/App.tsx` (routes)
- `frontend/src/components/AppSidebar.tsx` (nav)
- `src/lib/product-consensus.ts`, `src/lib/convergence.ts` (handoffs)
- `src/lib/office-coordinator.ts` (Office jobs)
- `frontend/src/components/settings/OrchestrationPlanPanel.tsx` (schedules)
