import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, FileWarning } from "lucide-react";
import type { ProductLastRunTrace } from "../../lib/api";

const CRITICAL_DIAGNOSES = new Set([
  "run_failed",
  "empty_agent_output",
  "no_docs_and_weak_handoff",
]);

export interface DeliverableHealthBannerProps {
  trace: ProductLastRunTrace | null | undefined;
  productId: string;
  /** Hide while a run is still in flight */
  hideDuringActiveRun?: boolean;
  activeRunStatus?: string | null;
}

export default function DeliverableHealthBanner({
  trace,
  productId,
  hideDuringActiveRun = true,
  activeRunStatus = null,
}: DeliverableHealthBannerProps) {
  const { t } = useTranslation();

  if (!trace?.run) return null;

  const inFlight =
    activeRunStatus === "RUNNING" ||
    activeRunStatus === "PENDING" ||
    activeRunStatus === "DELEGATED" ||
    activeRunStatus === "AWAITING_USER";

  if (hideDuringActiveRun && inFlight) return null;
  if (trace.diagnosis === "ok" || trace.diagnosis === "run_in_progress") return null;

  const isCritical = CRITICAL_DIAGNOSES.has(trace.diagnosis);
  const weakSteps = trace.steps.filter((s) => s.deliverableStatus !== "saved_to_disk").length;

  return (
    <div
      className={
        isCritical
          ? "mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
          : "mb-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:text-sky-100"
      }
      role="status"
    >
      <div className="flex gap-3">
        {isCritical ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        ) : (
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t("warRoom.deliverables.title")}</p>
          <p className="mt-1">
            {t(`consensus.lastRun.diagnosis.${trace.diagnosis}`, { defaultValue: trace.diagnosis })}
          </p>
          {weakSteps > 0 && trace.steps.length > 0 && (
            <p className="mt-1 text-xs opacity-90">
              {t("warRoom.deliverables.weakSteps", {
                count: weakSteps,
                total: trace.steps.length,
              })}
            </p>
          )}
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
            <Link
              to={`/products/${productId}/consensus`}
              className="text-[var(--color-primary)] hover:underline"
            >
              {t("warRoom.deliverables.viewTrace")}
            </Link>
            <Link to={`/runs/${trace.run.id}`} className="text-[var(--color-primary)] hover:underline">
              {t("warRoom.deliverables.openRun")}
            </Link>
            {trace.docsInWorkspace > 0 && (
              <Link
                to={`/products/${productId}/consensus?tab=reports`}
                className="text-[var(--color-primary)] hover:underline"
              >
                {t("warRoom.deliverables.agentDocs", { count: trace.docsInWorkspace })}
              </Link>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
