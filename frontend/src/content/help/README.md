# Help content

User-facing manuals for the in-app **Ayuda / Help** section (`/help`).

## Languages

| File | Locale | Route |
|------|--------|-------|
| `tutorial.md` | Spanish (`es`) | `/help/guia-completa` |
| `tutorial.en.md` | English (`en`) | `/help/guia-completa` |

Title and description come from `index.ts` and `i18n/locales/{es,en}/help.ts`. Body markdown switches with the header language selector.

## Manual scope

Non-technical **user manual** covering:

- Office: commissioning work, Coordinator, quick services, approve and run
- My jobs, War room, Products, Departments, Org Studio
- Agents, skills, workflows, linking products and departments
- Consensus memory, optional schedules, GO/NO-GO decisions
- Organization settings and human team roles

No install, Docker, worker, or API documentation — operators only.

## Adding an article

1. Create `your-article.md` and `your-article.en.md` (GFM).
2. Register in `ARTICLE_META` inside `index.ts` for both locales.
3. Extend `getHelpArticles()` return array.

Default route: `/help` → `/help/guia-completa`.

First `##` section (excluding “Tabla de contenidos”) opens by default as quick start. Sidebar renders each `##` / `###` as its own panel (`HelpPage` + `lib/markdown-sections.ts`).
