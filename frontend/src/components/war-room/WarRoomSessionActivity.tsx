import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { WarRoomSessionState } from "./hooks/useWarRoomTeam";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function WarRoomSessionActivity({ session }: { session: WarRoomSessionState }) {
const { t } = useTranslation();
const statusLabel = useMemo(() => {
    switch (session.status) {
      case "running":
      return t("warRoom.session.running");
      case "awaiting_input":
      return t("warRoom.session.awaitingInput");
      case "awaiting_approval":
      return t("warRoom.session.awaitingApproval");
      case "budget_exceeded":
      return t("warRoom.session.budgetExceeded");
      case "completed":
      return t("warRoom.session.completed");
      case "failed":
      return t("warRoom.session.failed");
      default:
      return t("warRoom.session.idle");
      }
      }, [session.status, t]);

  const latest = session.items[session.items.length - 1];

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
            {statusLabel}
          </span>
          {session.lastEventAt && (
          <span className="text-xs text-[var(--color-muted-foreground)]">{t("warRoom.session.lastEvent", { time: formatTime(session.lastEventAt) })}</span>
          )}
        </div>
        {session.lastToolCall && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            <span className="font-medium text-[var(--color-foreground)]">{session.lastToolCall.toolName}</span>
            {session.lastToolCall.argsPreview && <span className="truncate max-w-[240px]">({session.lastToolCall.argsPreview})</span>}
            <span>{formatTime(session.lastToolCall.at)}</span>
          </div>
        )}
      </div>

      {session.needInputPrompt && (
        <div className="mt-3 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-warning)]">{t("warRoom.session.needInput")}</div>
          <pre className="whitespace-pre-wrap text-[var(--color-foreground)]/90">{session.needInputPrompt}</pre>
        </div>
      )}

      {session.pendingApproval && (
        <div className="mt-3 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-warning)]">{t("warRoom.session.toolApproval")}</div>
          <div className="text-[var(--color-foreground)]/90">{session.pendingApproval.toolName ? `${session.pendingApproval.toolName}: ` : ""}{session.pendingApproval.reason}</div>
        </div>
      )}

      {session.budgetExceeded && (
        <div className="mt-3 rounded-lg border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-destructive)]">{t("warRoom.session.budgetExceededTitle")}</div>
          <div className="text-[var(--color-foreground)]/90">{session.budgetExceeded.reason}</div>
        </div>
      )}

      {session.lastFileChanged && (session.lastFileChanged.path || session.lastFileChanged.toolName) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-2 py-0.5">{t("warRoom.session.fileChanged")}</span>
          {session.lastFileChanged.path && <span className="truncate max-w-[320px] text-[var(--color-foreground)]">{session.lastFileChanged.path}</span>}
          {session.lastFileChanged.toolName && <span>via {session.lastFileChanged.toolName}</span>}
          <span>{formatTime(session.lastFileChanged.at)}</span>
        </div>
      )}

      {(session.summary || session.error) && (
        <div className="mt-3 space-y-2 text-sm">
          {session.summary && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">{t("warRoom.session.summary")}</div>
              <p className="text-[var(--color-foreground)]/90">{session.summary}</p>
            </div>
          )}
          {session.error && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-destructive)]">{t("warRoom.session.error")}</div>
              <pre className="whitespace-pre-wrap text-[var(--color-destructive)]/90">{session.error}</pre>
            </div>
          )}
        </div>
      )}

      {session.items.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            {t("warRoom.session.activityStream", { count: session.items.length })}
          </summary>
          <ol className="mt-2 space-y-1 max-h-48 overflow-auto pr-1">
            {session.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-muted)]/20 px-2 py-1.5 text-xs">
                <span className="mt-0.5 shrink-0 text-[var(--color-muted-foreground)]">{formatTime(item.at)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="capitalize font-medium text-[var(--color-foreground)]">{item.label}</span>
                    {item.toolName && <span className="text-[var(--color-primary)]">{item.toolName}</span>}
                    {item.path && <span className="truncate text-[var(--color-muted-foreground)]">{item.path}</span>}
                  </div>
                  {item.detail && <pre className="mt-1 whitespace-pre-wrap break-words text-[var(--color-foreground)]/80">{item.detail}</pre>}
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}

      {!latest && session.status === "idle" && (
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">{t("warRoom.session.noActivity")}</p>
      )}
    </section>
  );
}