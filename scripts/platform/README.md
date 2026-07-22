# Platform CLI scripts

Bridge between the original bash `auto-loop.sh` workflow and the v2 HTTP API.

## `cycle.sh`

Run a single autonomous cycle (consensus load → execute → consensus sync):

```bash
chmod +x scripts/platform/cycle.sh

export API_URL=http://localhost:3001/api
# Meta mode (default) — dynamic multi-product orchestrator
./scripts/platform/cycle.sh my-org owner@example.com 'password'

# Fixed workflow by UUID
./scripts/platform/cycle.sh my-org owner@example.com 'password' <workflow-uuid>
```

Use with cron or systemd instead of `auto-loop.sh` when running the multi-tenant platform.

## Worker scheduler

For continuous operation, enable **Settings → Autonomous company (meta schedule)** or create schedules via API — the worker process runs them automatically. See `/ops` for portfolio status.
