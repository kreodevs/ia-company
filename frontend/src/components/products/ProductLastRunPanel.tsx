import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ExternalLink, Eye, PlayCircle } from "lucide-react";
import type { ProductLastRunStepTrace, ProductLastRunTrace } from "../../lib/api";
import Panel from "../ui/Panel";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import AgentOutputPreviewModal from "./AgentOutputPreviewModal";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

export interface ProductLastRunPanelProps {
  trace: ProductLastRunTrace | null;
  loading?: boolean;
  productId: string;
}

export default function ProductLastRunPanel({
  trace,
  loading = false,
  productId,
}: ProductLastRunPanelProps) {
  const { t } = useTranslation();
  const [previewStep, setPreviewStep] = useState<ProductLastRunStepTrace | null>(null);

  if (loading) {
    return (
      <Panel title={t("consensus.lastRun.title")} bodySize="sm">
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("consensus.lastRun.loading")}</p>
      </Panel>
    );
  }

  if (!trace?.run) {
    return (
      <Panel title={t("consensus.lastRun.title")} bodySize="sm">
        <EmptyState
          title={t("consensus.lastRun.noRunTitle")}
          description={t("consensus.lastRun.noRunDesc")}
        />
      </Panel>
    );
  }

  const { run, steps, revisionsRecorded, docsInWorkspace, diagnosis } = trace;
  const statusLabel = t(`status.${run.status}`, { defaultValue: run.status });
  const showWarning = diagnosis !== "ok";

  return (
    <Panel
      title={t("consensus.lastRun.title")}
      subtitle={t("consensus.lastRun.subtitle")}
      bodySize="sm"
      actions={
        <Link
          to={`/runs/${run.id}`}
          className="interactive inline-flex items-center gap-1.5 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
        >
          <PlayCircle className="h-3.5 w-3.5" aria-hidden />
          {t("consensus.lastRun.openRun")}
        </Link>
      }
    >
      {showWarning && (
        <div
          className="mb-4 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <p>{t(`consensus.lastRun.diagnosis.${diagnosis}`)}</p>
        </div>
      )}

      <dl className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("consensus.lastRun.workflow")}
          </dt>
          <dd className="mt-0.5 font-medium">{run.workflowName}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("consensus.lastRun.status")}
          </dt>
          <dd className="mt-0.5">
            <StatusBadge status={run.status} label={statusLabel} />
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("consensus.lastRun.cost")}
          </dt>
          <dd className="mt-0.5 font-medium">
            {formatCost(run.totalCostUsd)} · {run.totalTokens.toLocaleString()} tok
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("consensus.lastRun.finished")}
          </dt>
          <dd className="mt-0.5 text-sm">{formatTime(run.completedAt ?? run.startedAt)}</dd>
        </div>
      </dl>

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-[var(--color-muted-foreground)]">
        <span>
          {t("consensus.lastRun.revisionsCount", { count: revisionsRecorded })}
        </span>
        <span>·</span>
        <span>{t("consensus.lastRun.docsCount", { count: docsInWorkspace })}</span>
        <span>·</span>
        <span className="font-mono text-[10px]">{run.id}</span>
      </div>

      {run.errorMessage && (
        <p className="mb-3 rounded-md border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">
          {run.errorMessage}
        </p>
      )}

      {steps.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("consensus.lastRun.noSteps")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-background)] text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-3 py-2">{t("consensus.lastRun.colAgent")}</th>
                <th className="px-3 py-2">{t("consensus.lastRun.colOutput")}</th>
                <th className="px-3 py-2">{t("consensus.lastRun.colHandoff")}</th>
                <th className="px-3 py-2">{t("consensus.lastRun.colTokens")}</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => {
                const chars = Math.max(step.outputChars, step.memoryKeyChars);
                const outputOk = chars > 0;
                return (
                  <tr
                    key={`${step.agentName}-${step.stepOrder}`}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="px-3 py-2 align-top">
                      <span className="font-medium">{step.agentName}</span>
                      <span className="ml-1 text-xs text-[var(--color-muted-foreground)]">
                        #{step.stepOrder}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-col gap-2">
                        <span
                          className={
                            outputOk
                              ? "text-emerald-400"
                              : "font-semibold text-[var(--color-destructive)]"
                          }
                        >
                          {outputOk
                            ? t("consensus.lastRun.chars", { count: chars })
                            : t("consensus.lastRun.emptyOutput")}
                        </span>
                        {step.outputPreview && (
                          <p className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
                            {step.outputPreview}
                          </p>
                        )}
                        {outputOk && (step.output || step.outputPreview) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-fit"
                            onClick={() => setPreviewStep(step)}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            {t("consensus.lastRun.viewOutput")}
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      {step.hasStructuredHandoff
                        ? t("consensus.lastRun.handoffJson")
                        : t("consensus.lastRun.handoffMissing")}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-[var(--color-muted-foreground)]">
                      {step.tokensUsed != null ? step.tokensUsed.toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
        <Link to={`/war-room/${productId}`} className="text-[var(--color-primary)] hover:underline">
          {t("consensus.lastRun.warRoomLink")}
        </Link>
        {" · "}
        <a
          href={`/runs/${run.id}`}
          className="inline-flex items-center gap-0.5 text-[var(--color-primary)] hover:underline"
        >
          {t("consensus.lastRun.logsHint")}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </p>

      <AgentOutputPreviewModal
        open={previewStep != null}
        agentName={previewStep?.agentName ?? ""}
        stepOrder={previewStep?.stepOrder ?? 0}
        output={previewStep?.output ?? previewStep?.outputPreview ?? ""}
        onClose={() => setPreviewStep(null)}
      />
    </Panel>
  );
}
