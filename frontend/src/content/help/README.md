# Help content

Markdown articles for the in-app **Ayuda / Help** section (`/help`).

## Languages

| File | Locale | Route |
|------|--------|-------|
| `tutorial.md` | Spanish (`es`) | `/help/guia-completa` |
| `tutorial.en.md` | English (`en`) | `/help/guia-completa` |

Article title and description come from `index.ts` per locale. Body markdown switches when the user changes language in the header.

## Current guide scope (2026)

The guide reflects the **Office-first** model:

- Default landing `/office`, jobs at `/office/encargos`
- Products with GitHub intake and per-product OpenCode
- Technical routes under `/debug/*` (runs, consensus, ops, catalog)
- Operations plan default: **on demand** (optional weekly presets)

## Adding an article

1. Create `your-article.md` and `your-article.en.md` in this folder (GFM).
2. Register entries in `ARTICLE_META` inside `index.ts` for both `es` and `en`.
3. Add a sidebar entry via `getHelpArticles()` (extend the returned array).

Default route: `/help` redirects to `/help/guia-completa`.

The guide opens on the **quick start (Office)** section — first `##` block before the table of contents. Sidebar navigation renders each `##` / `###` as its own panel (`HelpPage` + `lib/markdown-sections.ts`).

UI strings for the help shell live in `src/i18n/locales/{es,en}/help.ts`.
