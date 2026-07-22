# Help content

Markdown articles for the in-app **Ayuda / Help** section (`/help`).

## Languages

| File | Locale | Route |
|------|--------|-------|
| `tutorial.md` | Spanish (`es`) | `/help/guia-completa` |
| `tutorial.en.md` | English (`en`) | `/help/guia-completa` |

Article title and description come from `index.ts` per locale. Body markdown switches when the user changes language in the header.

## Adding an article

1. Create `your-article.md` and `your-article.en.md` in this folder (GFM).
2. Register entries in `ARTICLE_META` inside `index.ts` for both `es` and `en`.
3. Add a sidebar entry via `getHelpArticles()` (extend the returned array).

Default route: `/help` redirects to `/help/guia-completa`.

The guide opens on **“Qué puedes hacer con la aplicación”** / **“What you can do with the app”** — a hands-on tutorial section before the table of contents. Sidebar navigation renders each `##` / `###` block as its own panel (`HelpPage` + `lib/markdown-sections.ts`).

UI strings for the help shell (title, breadcrumb) live in `src/i18n/locales/{es,en}/help.ts`.
