# Help content

User-facing manuals for the in-app **Ayuda / Help** section (`/help`).

## Languages

Each article has Spanish (`*.md`) and English (`*.en.md`) bodies. Title and description switch via `getHelpArticles(lang)` in `index.ts`.

## Articles (one document per section)

| Slug | ES title | Topic |
|------|----------|-------|
| `guia-completa` | Manual de usuario | Hub: inicio rápido + mapa + FAQ |
| `guia-oficina` | Oficina y encargos | Coordinator, jobs, war room, archive |
| `guia-productos` | Productos | Phases, consensus, desk |
| `guia-departamentos` | Departamentos | Org Studio, design.md, gallery |
| `guia-equipo-ia` | Equipo IA y habilidades | Agents, skills, Catalog Studio, building agents, handoffs |
| `guia-flujos` | Flujos y programaciones | Workflows, schedules, Operations `/ops`, GO/NO-GO |

Default route: `/help` → `/help/guia-completa`.

### Legacy slug redirects

Old micro-article URLs redirect in `HelpPage` via `HELP_SLUG_REDIRECTS`:

| Old slug | Redirects to |
|----------|--------------|
| `guia-operaciones` | `guia-flujos#operaciones-ops` |
| `como-construir-agentes` | `guia-equipo-ia#cómo-construir-agentes` |
| `handoffs` | `guia-equipo-ia#handoffs-y-flujo` |

Within each guide, `##` headings become anchor links in **En este artículo** (scroll within one full document — not separate pages per section).

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

## Adding content

Prefer adding `##` sections to an existing guide rather than creating a new article. If a new top-level section is needed:

1. Add `##` / `###` blocks to the relevant `guia-*.md` and `.en.md`.
2. Update the guide's table of contents at the top.
3. Register a new article only when it is a genuinely separate product area.

## Mobile UX

- **Guías por tema** chip strip (below quick links) lists all 6 guides on mobile/tablet.
- **Artículos** sidebar stays expanded by default on small screens.
- Help icon (book) in the top bar on viewports &lt; 1024px.

## Scope

Non-technical **operator** documentation only — no Docker, worker CLI, or API setup. Code paths may be named sparingly when they clarify behavior (e.g. workflow slugs).

## Verification

When updating help, trace behavior in:

- `frontend/src/App.tsx` (routes)
- `frontend/src/components/AppSidebar.tsx` (nav)
- `src/lib/product-consensus.ts`, `src/lib/convergence.ts` (handoffs)
- `src/lib/office-coordinator.ts` (Office jobs)
- `frontend/src/components/settings/OrchestrationPlanPanel.tsx` (schedules)
