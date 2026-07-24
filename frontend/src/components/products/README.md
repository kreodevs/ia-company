# Product components

| Component | Purpose |
|-----------|---------|
| `ProductAgentDocsPanel` | Read-only browse of `docs/{role}/` markdown deliverables with rendered preview |
| `ProductLastRunPanel` | Traceability for the product's latest run (per-agent output, revisions count, diagnosis) |
| `ProductWorkLauncher` | Launch presets (SEO review, marketing sprint), custom workflows, or single agents on a product with workspace + memory context. Stays on the current page (war room refreshes in place; optional link to run detail in the header). |
| `AddProductDialog` | Register existing products (`projects/{slug}/`) with optional GitHub URL + team intake, or bootstrap a new empty workspace |

Used in `ProductsPage` (active products tab) and `WarRoomContent`.

## Product intake flow

When registering with a GitHub URL:

1. Tenant GitHub token from **Settings → Integrations** (for private repos).
2. Optional shallow clone into `projects/{slug}/` if the workspace is empty.
3. GitHub API context (README, languages, package.json) fed to workflow `product-intake`.
4. Agents produce `productProfile` JSON → saved in DB metadata, `memories/consensus.md`, and `product-profile.json`.
5. Future runs inject profile + description into agent system prompts.

API: `GET /products/importable`, `POST /products/register` (body: `githubRepoUrl`, `runIntake`, `cloneRepo`), `POST /products/:id/intake`, `POST /products/bootstrap`, `GET /products/:id/agent-docs`, `GET /products/:id/last-run`, `GET /products/:id/launch-options`, `POST /products/:id/launch`.

Tenant integrations: `GET/PUT /tenant/settings/integrations`, `POST /tenant/settings/integrations/github/test`.
