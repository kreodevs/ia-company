import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type ExecutionRun } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatusBadge from "../components/ui/StatusBadge";
import OpencodeRunPanel from "../components/opencode/OpencodeRunPanel";
import OpencodeDiffPanel from "../components/opencode/OpencodeDiffPanel";

interface StreamEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [opencodeInfo, setOpencodeInfo] = useState<Awaited<ReturnType<typeof api.opencode.getRun>> | null>(
    null,
  );
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    void api.runs.get(id).then(setRun);
    void api.opencode.getRun(id).then(setOpencodeInfo).catch(() => setOpencodeInfo(null));

    const unsubscribe = api.runs.streamLogs(id, (raw) => {
      const event = raw as StreamEvent & { runId?: string };
      setEvents((prev) => [...prev, event]);
      if (event.type === "step_complete" || event.type === "done" || event.type === "status") {
        void api.runs.get(id).then(setRun);
        void api.opencode.getRun(id).then(setOpencodeInfo).catch(() => setOpencodeInfo(null));
      }
    });

    return unsubscribe;
  }, [id]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [events]);

  if (!run) {
    return <PageLoading message={t("runs.list.loadingOne")} />;
  }

  const canCancel = run.status === "PENDING" || run.status === "RUNNING" || run.status === "DELEGATED";

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

  const statusLabel = t(`status.${run.status}`, { defaultValue: run.status });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link to="/runs" className="interactive text-[var(--color-primary)] hover:underline">
            ← {t("nav.runs")}
          </Link>
        }
        title={run.workflow?.name ?? t("runs.detail.defaultTitle")}
        subtitle={t("runs.detail.statusLine", {
          status: statusLabel,
          tokens: run.totalTokens.toLocaleString(),
          cost: run.totalCostUsd.toFixed(4),
        })}
        actions={
          canCancel ? (
            <Button variant="destructive" disabled={cancelling} onClick={() => void cancelRun()} fullWidthMobile>
              {cancelling ? t("common.cancelling") : t("runs.detail.cancelRun")}
            </Button>
          ) : (
            <StatusBadge status={run.status} label={statusLabel} />
          )
        }
      />

      {(run.status === "AWAITING_USER" || run.status === "DELEGATED") && id && (
        <OpencodeRunPanel
          runId={id}
          status={run.status}
          onUpdated={() => void api.runs.get(id).then(setRun)}
        />
      )}

      {opencodeInfo?.delegation && (
        <OpencodeDiffPanel
          diff={opencodeInfo.diff ?? []}
          resultSummary={opencodeInfo.delegation.resultSummary}
          sessionId={opencodeInfo.delegation.opencodeSessionId}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">{t("runs.detail.sharedMemory")}</h2>
          <pre className="max-h-96 overflow-auto rounded-lg bg-[var(--color-background)] p-3 text-xs">
            {JSON.stringify(run.sharedMemory, null, 2)}
          </pre>
        </Card>

        <Card>
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
        </Card>
      </div>
    </div>
  );
}
