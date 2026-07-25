# OpenCode UI

- `OpencodeRunPanel.tsx` — gate (OpenCode not configured) and delegated-run status on run detail.
- `OpencodeDiffPanel.tsx` — summary + file diff list from OpenCode delegation.
- `OpencodeHistoryPanel.tsx` — recent delegations for a product (War room / code page).
- `ProductOpencodeSettingsPanel.tsx` — per-product agent, model, and project path (`/products/:id/settings`).

**Tenant settings** (global): base URL, Basic Auth, enable flag, auto-approve permissions.

**Product settings** (per product): default agent, default model, project path on the OpenCode server.

**Backend hardening:**
- Dynamic `resumeFromStepOrder` from workflow graph (no hardcoded step 3)
- Poll retries on transient OpenCode errors (502/503/network)
- Degrade to local fullstack if delegation start/finalize fails
- Sync diff manifest to `projects/{slug}/.opencode/{runId}.json` + `docs/devops/` summary on finalize

API: `GET/PUT /tenant/settings/opencode`, `GET/PUT /products/:id/opencode/settings`.
