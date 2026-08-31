import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Crosshair, ExternalLink, FileText } from "lucide-react";
import type { OfficeEncargoSummary } from "../../../lib/api";
import { encargoTeamLabels } from "../../../lib/office-encargo-display";
import { formatWorkflowTitle } from "../../../lib/workflow-display";
import StatusBadge from "../../ui/StatusBadge";
import Button from "../../ui/Button";
import EncargoResultPanel from "./EncargoResultPanel";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isInFlight(phase: OfficeEncargoSummary["phase"]): boolean {
  return phase === "queued" || phase === "in_progress";
}

function summaryKindLabel(
  kind: OfficeEncargoSummary["finalReportKind"],
  t: (key: string) => string,
): string | null {
  if (kind === "summary") return t("productDeliveries.card.summarySynthesized");
  if (kind === "agent") return t("productDeliveries.card.summaryAgentFallback");
  if (kind === "none") return t("productDeliveries.card.summaryPending");
  return null;
}

export default function ProductDeliveryEncargoCard({
  item,
  productId,
  defaultExpanded = false,
  showWarRoomLink = false,
}: {
  item: OfficeEncargoSummary;
  productId: string;
  defaultExpanded?: boolean;
  showWarRoomLink?: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const inFlight = isInFlight(item.phase);
  const kindLabel = summaryKindLabel(item.finalReportKind, t);

  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="office-encargo-phase" data-phase={item.phase}>
                {t(`office.encargos.phase.${item.phase}`)}
              </span>
              <StatusBadge
                status={item.status}
                label={t(`status.${item.status}`, { defaultValue: item.status })}
              />
              {kindLabel && !inFlight ? (
                <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  {kindLabel}
                </span>
              ) : null}
            </div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {formatWorkflowTitle(item.procedureLabel || item.workflowName)} ·{" "}
              {formatWhen(item.completedAt ?? item.createdAt)}
            </p>

            {inFlight ? (
              <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {t("productDeliveries.card.inProgressSummary")}
              </p>
            ) : item.reportPreview ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2.5">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  <FileText className="h-3 w-3" aria-hidden />
                  {t("productDeliveries.card.reportPreviewLabel")}
                </p>
                <p className="text-sm leading-relaxed text-[var(--color-foreground)]">{item.reportPreview}</p>
              </div>
            ) : item.phase === "delivered" || item.phase === "failed" ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t("productDeliveries.card.noFinalReport")}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {showWarRoomLink ? (
              <Link to={`/war-room/${productId}?run=${item.id}`}>
                <Button variant="secondary" size="sm">
                  <Crosshair className="mr-1 h-3.5 w-3.5" aria-hidden />
                  {t("productDeliveries.inProgress.watchLive")}
                </Button>
              </Link>
            ) : null}
            {!inFlight ? (
              <Button variant={expanded ? "ghost" : "secondary"} size="sm" onClick={() => setExpanded((v) => !v)}>
                {expanded ? (
                  <>
                    <ChevronUp className="mr-1 h-3.5 w-3.5" aria-hidden />
                    {t("productDeliveries.card.collapse")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-3.5 w-3.5" aria-hidden />
                    {t("productDeliveries.card.expand")}
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
          <span>
            {item.documentCount > 0
              ? t("productDeliveries.card.documents", { count: item.documentCount })
              : t("productDeliveries.card.noDocuments")}
          </span>
          {item.totalCostUsd > 0 ? (
            <span>{t("productDeliveries.card.cost", { cost: `$${item.totalCostUsd.toFixed(2)}` })}</span>
          ) : null}
          {item.teamAgents.length > 0 ? (
            <span>{encargoTeamLabels(item.teamAgents, t)}</span>
          ) : null}
          <Link
            to={`/office/encargos/${item.id}`}
            className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
          >
            {t("productDeliveries.actions.fullEncargo")}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>

      {expanded && !inFlight ? (
        <div className="border-t border-[var(--color-border)] px-4 pb-4">
          <EncargoResultPanel runId={item.id} enabled={expanded} phase={item.phase} />
        </div>
      ) : null}
    </li>
  );
}
