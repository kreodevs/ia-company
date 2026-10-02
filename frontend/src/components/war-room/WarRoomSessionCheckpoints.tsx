import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { api, type OfficeRunCheckpoint } from "../../lib/api";

type Props = {
  watchRunId?: string | null;
};

function checkpointPrompt(checkpoint: OfficeRunCheckpoint): string {
  const payload = (checkpoint.payload ?? {}) as { prompt?: unknown; reason?: unknown; note?: unknown };
  if (typeof payload.prompt === "string") return payload.prompt;
  if (typeof payload.reason === "string") return payload.reason;
  if (typeof payload.note === "string") return payload.note;
  return checkpoint.title ?? "";
}

/**
 * Panel HITL de la war-room: muestra los checkpoints pendientes del run en
 * vivo (need_input, tool_approval, review) y permite resolverlos desde la UI.
 * Al resolver, la sesión se reanuda con la respuesta del fundador.
 */
export default function WarRoomSessionCheckpoints({ watchRunId }: Props) {
  const { t } = useTranslation();
  const [checkpoints, setCheckpoints] = useState<OfficeRunCheckpoint[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!watchRunId) {
      setCheckpoints([]);
      setSessionId(null);
      return;
    }
    try {
      const resp = await api.office.runSessions(watchRunId);
      const first = (resp.sessions ?? []).find((s) =>
        ["AWAITING_INPUT", "AWAITING_APPROVAL"].includes(s.status),
      ) ?? (resp.sessions ?? [])[0];
      setSessionId(first?.id ?? null);
      if (!first) {
        setCheckpoints([]);
        return;
      }
      const cp = await api.office.sessionCheckpoints(first.id);
      setCheckpoints(cp.checkpoints ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "checkpoint load failed");
    }
  }, [watchRunId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const resolve = useCallback(
    async (checkpoint: OfficeRunCheckpoint, status: "resolved" | "expired") => {
      if (!sessionId || busyId) return;
      setBusyId(checkpoint.id);
      try {
        await api.office.resolveSessionCheckpoint(sessionId, checkpoint.id, {
          status,
          resolution: status === "resolved" && answer.trim() ? { humanInput: answer.trim() } : {},
        });
        if (status === "resolved" && answer.trim()) {
          await api.office.resumeSession(sessionId, answer.trim());
        }
        setAnswer("");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "checkpoint resolve failed");
      } finally {
        setBusyId(null);
      }
    },
    [answer, busyId, load, sessionId],
  );

  if (!watchRunId) return null;

  const visible = checkpoints.filter((cp) => cp.status === "pending");

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
        {t("office.checkpoints.title", { defaultValue: "Checkpoints humanos" })}
        {visible.length > 0 && (
          <span className="ml-2 rounded-full bg-[var(--color-warning)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-warning)]">
            {visible.length}
          </span>
        )}
      </h3>
      {error && (
        <p className="mt-2 text-xs text-[var(--color-destructive)]">{error}</p>
      )}
      {visible.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          {t("office.checkpoints.empty", { defaultValue: "Sin checkpoints pendientes." })}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {visible.map((cp) => (
            <li key={cp.id} className="rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-warning)]">
                {cp.kind === "tool_approval" ? <AlertTriangle aria-hidden className="h-3.5 w-3.5" /> : <AlertTriangle aria-hidden className="h-3.5 w-3.5" />}
                {t(`office.checkpoints.kind.${cp.kind}`, { defaultValue: cp.kind })}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-foreground)]/90">
                {checkpointPrompt(cp)}
              </p>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={2}
                placeholder={t("office.checkpoints.answerPlaceholder", {
                  defaultValue: "Respuesta para el agente (opcional para aprobar)",
                })}
                className="mt-2 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm text-[var(--color-foreground)]"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={busyId === cp.id}
                  onClick={() => void resolve(cp, "resolved")}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 disabled:opacity-50"
                >
                  <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
                  {t("office.checkpoints.resolve", { defaultValue: "Responder y reanudar" })}
                </button>
                <button
                  type="button"
                  disabled={busyId === cp.id}
                  onClick={() => void resolve(cp, "expired")}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/40 disabled:opacity-50"
                >
                  <XCircle aria-hidden className="h-3.5 w-3.5" />
                  {t("office.checkpoints.expire", { defaultValue: "Descartar" })}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
