import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ExecutionRun } from "../lib/api";

interface StreamEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    void api.runs.get(id).then(setRun);

    const unsubscribe = api.runs.streamLogs(id, (raw) => {
      const event = raw as StreamEvent & { runId?: string };
      setEvents((prev) => [...prev, event]);
      if (event.type === "step_complete" || event.type === "done") {
        void api.runs.get(id).then(setRun);
      }
    });

    return unsubscribe;
  }, [id]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [events]);

  if (!run) {
    return <p className="text-[var(--color-muted-foreground)]">Loading run…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/runs" className="text-sm text-[var(--color-muted-foreground)] hover:underline">
          ← Runs
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{run.workflow?.name ?? "Execution Run"}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Status: <span className="font-medium text-[var(--color-foreground)]">{run.status}</span>
          {" · "}
          {run.totalTokens.toLocaleString()} tokens · ${run.totalCostUsd.toFixed(4)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="mb-3 font-semibold">Shared Memory</h2>
          <pre className="max-h-96 overflow-auto rounded-lg bg-[var(--color-background)] p-3 text-xs">
            {JSON.stringify(run.sharedMemory, null, 2)}
          </pre>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="mb-3 font-semibold">Live Log</h2>
          <div ref={logRef} className="max-h-96 space-y-2 overflow-y-auto font-mono text-xs">
            {events.map((ev, i) => (
              <div key={i} className="rounded border border-[var(--color-border)] bg-[var(--color-background)] p-2">
                <span className="text-[var(--color-primary)]">[{ev.type}]</span>{" "}
                {ev.type === "step_start" && (
                  <span>Starting {(ev.data as { agentName?: string }).agentName}</span>
                )}
                {ev.type === "step_complete" && (
                  <span>
                    Done {(ev.data as { agentName?: string }).agentName} (
                    {(ev.data as { tokensUsed?: number }).tokensUsed} tokens)
                  </span>
                )}
                {ev.type === "log" && (
                  <span>{(ev.data as { message?: string }).message}</span>
                )}
                {ev.type === "error" && (
                  <span className="text-[var(--color-destructive)]">
                    {(ev.data as { message?: string }).message}
                  </span>
                )}
                {ev.type === "done" && (
                  <span className="text-[var(--color-accent)]">
                    Finished — {(ev.data as { status?: string }).status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
