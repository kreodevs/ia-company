# OpenCode integration

**Platform (superadmin):** Admin → Platform settings → **OpenCode** — master enable + default poll/wait for new tenants.

**Tenant:** Settings → OpenCode — URL, Basic Auth, enable, and **tenant-wide defaults** (agent, model, project path).

**Product:** Product settings / code page — optional overrides per product (inherits tenant defaults when empty).

Each tenant connects to its own OpenCode server under **Settings → OpenCode**.

## Flow

1. `feature-development` runs strategy steps locally (interaction, UI).
2. If OpenCode is configured, `fullstack-dhh` delegates via `delegate_implementation`.
3. Before delegating, the run pauses at **AWAITING_USER** (`opencode_confirm`) so the tenant admin can override **project path**, **model**, and **agent** for that run (defaults come from product OpenCode settings).
4. Run status becomes `DELEGATED`; worker polls OpenCode until idle.
5. QA + DevOps resume locally using the OpenCode summary in shared memory.

## If OpenCode is not configured

Run pauses with status `AWAITING_USER`. Tenant admin chooses:

- **Continue with Auto-Company** — local coding tools
- **Cancel run**

## Deploy notes

- Worker must reach the tenant OpenCode URL (server-to-server).
- The **Test connection** button also runs from the API container — not from the user's browser. `localhost` / `127.0.0.1` only work if OpenCode runs in the same container as the API/worker.
- For self-signed HTTPS, set `OPENCODE_INSECURE_TLS=true` on the **api** and **worker** services.
- Only `ENCRYPTION_KEY` / `JWT_SECRET` stays in platform env; tenant credentials live in DB encrypted.
- Apply migration `20250722180000_opencode_integration`.
- See also `docs/fullstack/opencode-bridge.md` for module map and API list.

## UI surfaces

- **Settings → OpenCode** — tenant credentials
- **Run detail** — gate, delegated status, diff panel
- **Products** — badge when OpenCode is active on a product
- **War room** — external implementation pill + delegation history
- **Product code** — latest OpenCode diff + history
