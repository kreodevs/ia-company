# Help content

User-facing manuals for the in-app **Ayuda / Help** section (`/help`).

## Languages

Each article has Spanish (`*.md`) and English (`*.en.md`) bodies. Title and description switch via `getHelpArticles(lang)` in `index.ts`.

## Articles (one document per section)

| Slug | ES title | Topic |
|------|----------|-------|
| `guia-completa` | Manual de usuario | Hub: inicio rápido + mapa + FAQ |
| `guia-oficina` | Oficina y encargos | Coordinator, KPIs, My pending, jobs, war room, OpenCode |
| `guia-productos` | Productos | Opportunities, phases, desk, product settings |
| `guia-departamentos` | Departamentos | Org Studio, staff, virtual rooms vs Org Units, design.md |
| `guia-equipo-ia` | Plantilla de especialistas y habilidades | Agents, skills, Catalog Studio, building agents, handoffs |
| `guia-flujos` | Procedimientos y programaciones | Procedures, AI Studio, schedules, Operations `/ops`, GO/NO-GO |
| `guia-configuracion` | Configuración del tenant | Settings tabs, interests, human team, GitHub/SMTP, MCP |
| `guia-piloto` | Flujo diario piloto | 30–60 min/day routine: job → war room → client delivery |

Default route: `/help` → `/help/guia-completa`.

### Legacy slug redirects

Old micro-article URLs redirect in `HelpPage` via `HELP_SLUG_REDIRECTS`:

| Old slug | Redirects to |
|----------|--------------|
| `guia-operaciones` | `guia-flujos#operaciones-ops` |
| `como-construir-agentes` | `guia-equipo-ia#cómo-construir-agentes` |
| `handoffs` | `guia-equipo-ia#handoffs-y-flujo` |
| `decisiones` | `guia-oficina#mis-pendientes` |

Within each guide, `##` headings become anchor links in **En este artículo** (scroll within one full document — not separate pages per section).

**Back to TOC:** `HelpPage` injects `[↑ Volver al índice](#tabla-de-contenidos)` at the end of every `##` section (except the TOC itself) via `lib/help-markdown.ts`. Guides must include a `## Tabla de contenidos` / `## Table of contents` block.

## Navigation notes (for authors)

- **Office section** (sidebar `nav.sectionOffice`): Home, **My pending** (`/office/pendientes`, badge), My jobs, Archive, War room, Products, Org Units.
- **Debug office section** (`nav.sectionDebugOffice`): Runs, Consensus, Ops, Decisions (`/debug/decisions`) — tenant admins also see Team and Settings here.
- **GO/NO-GO inbox (operators):** `/office/pendientes` — not `/debug/decisions`. Legacy `/decisions` redirects to My pending.
- **Procedures catalog:** `/settings/procedures` (not `?tab=procedures`).
- **War room run focus:** `?run=<runId>` (not `?watchRun=`).
- **Product consensus** route: `/debug/products/:productId/consensus` (not under Products in main nav).
- **Tenant login** redirects to `/ops`; Office home is `/office` (sidebar **Inicio** / **Home**).
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

- **Guías por tema** chip strip (below quick links) lists all 8 guides on mobile/tablet.
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
