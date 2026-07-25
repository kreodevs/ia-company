import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import type { ProductLastRunTrace } from "../../lib/api";

export interface ProductHealthPanelProps {
  trace: ProductLastRunTrace | null | undefined;
  productId: string;
  activeRunStatus?: string | null;
}

const IN_FLIGHT = new Set(["RUNNING", "PENDING", "DELEGATED", "AWAITING_USER"]);

export default function ProductHealthPanel({
  trace,
  productId,
  activeRunStatus = null,
}: ProductHealthPanelProps) {
  const { t } = useTranslation();

  if (activeRunStatus && IN_FLIGHT.has(activeRunStatus)) {
    return (
      <div className="product-health product-health--live mb-4" role="status">
        <Activity className="h-4 w-4 shrink-0 product-health__icon" aria-hidden />
        <div>
          <p className="product-health__title">{t("warRoom.health.liveTitle")}</p>
          <p className="product-health__meta">{t("warRoom.health.liveHint")}</p>
        </div>
      </div>
    );
  }

  if (!trace?.run) {
    return (
      <div className="product-health product-health--empty mb-4" role="status">
        <FileWarning className="h-4 w-4 shrink-0 product-health__icon" aria-hidden />
        <p>{t("warRoom.health.noRun")}</p>
      </div>
    );
  }

  const isOk = trace.diagnosis === "ok";
  const isVeto = trace.diagnosis === "munger_veto";
  const tone = isOk ? "ok" : isVeto ? "veto" : "warn";

  return (
    <div className={`product-health product-health--${tone} mb-4`} role="status">
      <div className="product-health__head">
        {isOk ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 product-health__icon" aria-hidden />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 product-health__icon" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="product-health__title">
            {isOk
              ? t("warRoom.health.okTitle")
              : isVeto
                ? t("warRoom.vetoTitle")
                : t("warRoom.health.issueTitle")}
          </p>
          {!isOk && (
            <p className="product-health__meta">
              {t(`consensus.lastRun.diagnosis.${trace.diagnosis}`, {
                defaultValue: trace.diagnosis,
              })}
            </p>
          )}
        </div>
      </div>

      <dl className="product-health__grid">
        <div>
          <dt>{t("warRoom.health.deliverables")}</dt>
          <dd>
            {trace.deliverablesSaved}/{trace.deliverablesTotal || trace.steps.length}
          </dd>
        </div>
        <div>
          <dt>{t("warRoom.health.consensus")}</dt>
          <dd>{t("warRoom.health.consensusKb", { size: trace.consensusSizeKb })}</dd>
        </div>
        <div>
          <dt>{t("warRoom.health.mcp")}</dt>
          <dd>
            {trace.mcpToolCalls > 0
              ? t("warRoom.health.mcpUsed", { count: trace.mcpToolCalls })
              : trace.mcpFallbackUsed
                ? t("warRoom.health.mcpFallback")
                : t("warRoom.health.mcpNone")}
          </dd>
        </div>
        <div>
          <dt>{t("warRoom.health.revisions")}</dt>
          <dd>{trace.revisionsRecorded}</dd>
        </div>
      </dl>

      <p className="product-health__links">
        <Link to={`/products/${productId}/consensus`}>{t("warRoom.deliverables.viewTrace")}</Link>
        <Link to={`/runs/${trace.run.id}`}>{t("warRoom.deliverables.openRun")}</Link>
        <Link to={`/office/encargos/${trace.run.id}`}>{t("warRoom.health.openEncargo")}</Link>
      </p>
    </div>
  );
}
