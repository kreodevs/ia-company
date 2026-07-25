# OpenCode UI

- `OpencodeRunPanel.tsx` — gate (OpenCode not configured), **per-run confirm** (path/model/agent), and delegated-run status on run detail.
- `OpencodeDiffPanel.tsx` — summary + file diff list from OpenCode delegation.
- `OpencodeHistoryPanel.tsx` — recent delegations for a product (War room / code page).
- `ProductOpencodeSettingsPanel.tsx` — per-product agent, model, and project path (`/products/:id/settings`).

**Tenant settings** (`/settings` → OpenCode): base URL, Basic Auth, enable flag, auto-approve permissions, and **tenant-wide default agent / model / project path**.

**Product settings** (per product): optional overrides; empty fields inherit tenant defaults.

**Per run** (feature-development): when OpenCode is configured, the run pauses before delegation. On the run detail / war room panel, confirm or override path, model, and agent, then click **Delegate to OpenCode**. API: `POST /runs/:id/opencode-gate` with `decision: "proceed_opencode"`.

**Backend hardening:**
- Dynamic `resumeFromStepOrder` from workflow graph (no hardcoded step 3)
- Poll retries on transient OpenCode errors (502/503/network)
- Degrade to local fullstack if delegation start/finalize fails
- Sync diff manifest to `projects/{slug}/.opencode/{runId}.json` + `docs/devops/` summary on finalize

API: `GET/PUT /tenant/settings/opencode`, `GET/PUT /products/:id/opencode/settings`.
