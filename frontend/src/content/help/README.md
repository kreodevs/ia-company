# Help content

User-facing manuals for the in-app **Ayuda / Help** section (`/help`).

## Languages

Each article has Spanish (`*.md`) and English (`*.en.md`) bodies. Title and description switch via `getHelpArticles(lang)` in `index.ts`.

## Articles

| Slug | ES title | Topic |
|------|----------|-------|
| `guia-completa` | Manual de usuario | Hub: inicio rápido + mapa + FAQ (no duplica guías) |
| `guia-oficina` | Oficina y encargos | Coordinator, jobs, war room |
| `guia-productos` | Productos | Lifecycle, product consensus |
| `guia-departamentos` | Departamentos | Org Studio, design.md, gallery |
| `guia-equipo-ia` | Equipo IA y habilidades | Agents, skills, Catalog Studio |
| `guia-flujos` | Flujos y programaciones | Workflows, schedules, GO/NO-GO |
| `como-construir-agentes` | ¿Cómo construir agentes? | System prompt + consensus handoff |
| `handoffs` | Handoffs y flujo | All handoff types and pipeline effects |

Default route: `/help` → `/help/guia-completa`.

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

**Mobile / iPad (< 1024px):** Help icon (book) in the top bar next to notifications. On `HelpPage`, **Artículos** and **En este artículo** are collapsible toggles (collapsed by default); document content renders first. Desktop: always-expanded sidebar.

## Scope

Non-technical **operator** documentation only — no Docker, worker, or API setup.
