# OpenCode bridge (fullstack)

## Modules

| File | Role |
|------|------|
| `src/lib/tenant-opencode.ts` | Per-tenant config, encrypt/mask, test connection |
| `src/lib/opencode-client.ts` | HTTP client (Basic Auth), permissions auto-approve |
| `src/lib/opencode-bridge.ts` | Delegate, poll, finalize, gate, cancel |
| `src/lib/opencode-brief.ts` | Implementation brief template |
| `src/lib/opencode-diff.ts` | Normalize OpenCode diff JSON |
| `src/lib/opencode-history.ts` | Product history + active delegation map |
| `src/worker/opencode-queue.ts` | BullMQ poll jobs |
| `src/worker/opencode-processor.ts` | Poll worker |

## Run lifecycle

1. `feature-development` starts → gate if OpenCode disabled.
2. Steps 0–1 local (interaction, UI).
3. Step 2 (`fullstack-dhh`) calls `delegate_implementation` → `DELEGATED`.
4. Worker polls `/session/status` until idle.
5. Bridge fetches diff + summary → `opencode.delegate.complete` audit.
6. Workflow resumes at step 3 (QA) with `opencodeResultSummary` in memory.

## API

- `GET/PUT /tenant/settings/opencode`
- `POST /tenant/settings/opencode/test`
- `GET /runs/:id/opencode`
- `POST /runs/:id/opencode-gate`
- `POST /runs/:id/opencode/cancel`
- `GET /products/:id/opencode/history`
- `GET /products/:id/opencode/latest`

## Frontend

- Settings → OpenCode tab
- Run detail → gate / delegated panel + diff
- Products → active OpenCode badge
- War room → external implementation pill + history
- Product code → latest OpenCode diff + history
