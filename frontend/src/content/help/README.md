# Help content

Markdown articles for the in-app **Ayuda** section (`/help`).

## Adding an article

1. Create `your-article.md` in this folder (GFM: tables, code fences, lists).
2. Register it in `index.ts` with `slug`, `title`, `description`, and `content` import (`?raw`).
3. The sidebar on `HelpPage` lists all entries automatically.

## Current articles

| Slug | File | Title |
|------|------|-------|
| `guia-completa` | `tutorial.md` | Guía completa |

Default route: `/help` redirects to `/help/guia-completa`.
