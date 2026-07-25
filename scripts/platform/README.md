# Platform CLI scripts

Bridge between external cron/systemd and the v2 HTTP API.

## `cycle.sh`

Run a single cycle (consensus load → execute workflow → consensus sync):

```bash
chmod +x scripts/platform/cycle.sh

export API_URL=http://localhost:3001/api
# Fixed workflow by UUID
./scripts/platform/cycle.sh my-org owner@example.com 'password' <workflow-uuid>
```

Use with cron or systemd when you want HTTP-triggered runs instead of the worker scheduler.

## Worker scheduler

For continuous operation, run `npm run worker` and configure **Settings → Orchestration** with fixed workflow rules. On-demand work goes through **Office** (`/office`). See `/ops` for portfolio status.

Legacy `auto-loop.sh` is archived — see [`archive/legacy-cli/README.md`](../../archive/legacy-cli/README.md).
