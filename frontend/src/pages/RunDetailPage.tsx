import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type ExecutionRun } from "../lib/api";

interface StreamEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [cancelling, setCancelling] = useState(false);
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
    return <p className="text-[var(--color-muted-foreground)]">{t("runs.list.loadingOne")}</p>;
  }

  const canCancel = run.status === "PENDING" || run.status === "RUNNING";

  const cancelRun = async () => {
    if (!id || !canCancel) return;
    setCancelling(true);
    try {
      await api.runs.cancel(id);
      setRun(await api.runs.get(id));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/runs" className="text-sm text-[var(--color-muted-foreground)] hover:underline">
          ← {t("nav.runs")}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{run.workflow?.name ?? t("runs.detail.defaultTitle")}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("runs.detail.statusLine", {
            status: t(`status.${run.status}`, { defaultValue: run.status }),
            tokens: run.totalTokens.toLocaleString(),
            cost: run.totalCostUsd.toFixed(4),
          })}
        </p>
        {canCancel && (
          <button
            disabled={cancelling}
            onClick={() => void cancelRun()}
            className="mt-3 rounded-lg border border-[var(--color-destructive)] px-4 py-2 text-sm text-[var(--color-destructive)] disabled:opacity-50"
          >
            {cancelling ? t("common.cancelling") : t("runs.detail.cancelRun")}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="mb-3 font-semibold">{t("runs.detail.sharedMemory")}</h2>
          <pre className="max-h-96 overflow-auto rounded-lg bg-[var(--color-background)] p-3 text-xs">
            {JSON.stringify(run.sharedMemory, null, 2)}
          </pre>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="mb-3 font-semibold">{t("runs.detail.liveLog")}</h2>
          <div ref={logRef} className="max-h-96 space-y-2 overflow-y-auto font-mono text-xs">
            {events.map((ev, i) => (
              <div key={i} className="rounded border border-[var(--color-border)] bg-[var(--color-background)] p-2">
                <span className="text-[var(--color-primary)]">[{ev.type}]</span>{" "}
                {ev.type === "step_start" && (
                  <span>
                    {t("runs.detail.stepStart", {
                      agentName: (ev.data as { agentName?: string }).agentName,
                    })}
                  </span>
                )}
                {ev.type === "step_complete" && (
                  <span>
                    {t("runs.detail.stepComplete", {
                      agentName: (ev.data as { agentName?: string }).agentName,
                      tokensUsed: (ev.data as { tokensUsed?: number }).tokensUsed,
                    })}
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
                    {t("runs.detail.done", {
                      status: t(`status.${(ev.data as { status?: string }).status ?? ""}`, {
                        defaultValue: (ev.data as { status?: string }).status,
                      }),
                    })}
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
