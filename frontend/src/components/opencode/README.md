# OpenCode UI

- `OpencodeRunPanel.tsx` — gate (OpenCode not configured) and delegated-run status on run detail.
- `OpencodeDiffPanel.tsx` — summary + file diff list from OpenCode delegation.
- `OpencodeHistoryPanel.tsx` — recent delegations for a product (War room / code page).
- `ProductOpencodeSettingsPanel.tsx` — per-product agent, model, and project path (`/products/:id/code`).

**Tenant settings** (global): base URL, Basic Auth, enable flag, auto-approve permissions.

**Product settings** (per product): default agent, default model, project path on the OpenCode server.

API: `GET/PUT /tenant/settings/opencode`, `GET/PUT /products/:id/opencode/settings`.
