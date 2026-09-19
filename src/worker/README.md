# Worker (BullMQ)

Processes workflow runs and OpenCode delegation polls.

## Queues

| Queue | File | Retries | Notes |
|-------|------|---------|-------|
| `workflow-execution` | `queue.ts` | 3 (exponential backoff) | Main encargo/workflow runs |
| `workflow-execution-dlq` | `dead-letter.ts` | — | Failed jobs after max attempts (Oleada 4) |
| `opencode-delegation` | `opencode-queue.ts` | 5 | OpenCode session polling |

## Oleada 4 — robust orchestration

- **Per-tenant lock** (`tenant-run-lock.ts`) — worker concurrency 2 will not execute two jobs for the same tenant in parallel.
- **Dead letter** — exhausted retries mark the run `FAILED` and enqueue payload to DLQ.
- **Durable run events** — engine publishes to PostgreSQL (`ExecutionRunEvent`) + Redis pub/sub (`run-events.ts`) for multi-instance SSE.

Run: `npm run worker`
