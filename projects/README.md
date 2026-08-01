# Projects workspace

All tenant products live under `projects/{slug}/`. Each folder is the agent workspace for that product: code, `docs/{role}/` deliverables, and optional vertical pack metadata.

## Vertical packs (Phase B1)

A **vertical pack** is a manifest at `projects/{slug}/vertical-pack.json` that bundles:

| Field | Purpose |
|-------|---------|
| `product` | Name, slug, description, phase for tenant registration |
| `workflows` | Platform workflow names cloned to the tenant on apply |
| `presets` | Overrides for product work presets (task templates, deliverables) |
| `profileSeed` | Initial product profile when none exists |
| `playbookPath` | Operator guide (e.g. `PLAYBOOK.md`) |

### Apply from the UI

**Products → Vertical packs → Apply** calls `POST /products/vertical-packs/:packId/apply`, which:

1. Registers the product (`registerExistingProduct`)
2. Sets focus product
3. Clones listed workflows to the tenant
4. Seeds profile + consensus next action (if configured)
5. Stores `verticalPackId` in product metadata

### Available packs

| Slug | Pack ID | Description |
|------|---------|-------------|
| [snapog/](snapog/) | `snapog` | OG image API micro-SaaS on Cloudflare Workers |

To add a new vertical: copy the SnapOG manifest pattern, add code under `projects/{slug}/`, and restart the API (pack list is discovered from disk).

## Conventions

- Product code: `projects/{slug}/src/` (or project-specific layout)
- Agent outputs: `projects/{slug}/docs/{role}/`
- Never commit secrets — use platform settings or deployment secrets
