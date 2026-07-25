# Legacy CLI auto-loop (archived)

These files supported the **original single-tenant CLI workflow** (Claude Code / Codex loop + `memories/consensus.md`). They are **not used** by the v2 platform (Fastify + Worker + Office).

## Active platform instead

| Legacy | v2 replacement |
|--------|----------------|
| `auto-loop.sh` | `npm run worker` + optional **fixed** schedules in Settings |
| `memories/consensus.md` | Tenant / product consensus in PostgreSQL (+ file mirror for tools) |
| 24/7 autonomous meta cycle | **Office** on-demand + coordinator brief |
| `PROMPT.md` per cycle | Workflow engine + agent system prompts in DB |

## Contents

- `scripts/core/auto-loop.sh` — main loop (archived copy)
- `scripts/core/stop-loop.sh` — graceful stop
- `scripts/core/monitor.sh` — log watcher

Stubs at `scripts/core/*.sh` print a deprecation message.

## Still used from the old repo layout

- **`claude/agents/`** and **`claude/skills/`** — seeded into tenants via `src/lib/seed-platform.ts` (content, not runtime).
- **`scripts/platform/cycle.sh`** — optional HTTP trigger for a scheduled rule (API bridge).

Do not delete `claude/` when cleaning legacy CLI; only the bash loop is obsolete.
