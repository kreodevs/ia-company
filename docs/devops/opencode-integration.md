# OpenCode integration

Each tenant configures its own OpenCode server under **Settings → OpenCode**.

## Flow

1. `feature-development` runs strategy steps locally (interaction, UI).
2. If OpenCode is configured, `fullstack-dhh` delegates via `delegate_implementation`.
3. Run status becomes `DELEGATED`; worker polls OpenCode until idle.
4. QA + DevOps resume locally using the OpenCode summary in shared memory.

## If OpenCode is not configured

Run pauses with status `AWAITING_USER`. Tenant admin chooses:

- **Continue with Auto-Company** — local coding tools
- **Cancel run**

## Deploy notes

- Worker must reach the tenant OpenCode URL (server-to-server).
- Only `ENCRYPTION_KEY` / `JWT_SECRET` stays in platform env; tenant credentials live in DB encrypted.
- Apply migration `20250722180000_opencode_integration`.
- See also `docs/fullstack/opencode-bridge.md` for module map and API list.

## UI surfaces

- **Settings → OpenCode** — tenant credentials
- **Run detail** — gate, delegated status, diff panel
- **Products** — badge when OpenCode is active on a product
- **War room** — external implementation pill + delegation history
- **Product code** — latest OpenCode diff + history
