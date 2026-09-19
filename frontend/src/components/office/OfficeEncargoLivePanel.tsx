import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crosshair } from "lucide-react";
import { api, type OfficeEncargoPhase } from "../../lib/api";
import { agentDisplayLabel } from "../../lib/office-visual";
import WarRoomTable from "../war-room/WarRoomTable";
import WarRoomVetoBanner from "../war-room/WarRoomVetoBanner";
import { useWarRoomTeam } from "../war-room/hooks/useWarRoomTeam";

export interface OfficeEncargoLivePanelProps {
  runId: string;
  title?: string;
  phase?: OfficeEncargoPhase;
  departmentSlug?: string | null;
  orgUnitId?: string | null;
  productId?: string | null;
  productName?: string | null;
  warRoomHref?: string | null;
  teamAgents?: string[];
}

export default function OfficeEncargoLivePanel({
  runId,
  title,
  phase,
  departmentSlug,
  orgUnitId,
  productId,
  productName,
  warRoomHref,
  teamAgents = [],
}: OfficeEncargoLivePanelProps) {
  const { t } = useTranslation();
  const isLive = phase === "in_progress" || phase === "queued";

  const fetchTeam = useCallback(async () => {
    if (orgUnitId) return api.orgUnits.team(orgUnitId, runId);
    if (departmentSlug) return api.office.departmentTeam(departmentSlug, runId);
    if (productId) return api.products.team(productId, runId);
    return null;
  }, [departmentSlug, orgUnitId, productId, runId]);

  const scopeKey = orgUnitId
    ? `org:${orgUnitId}`
    : departmentSlug
      ? `dept:${departmentSlug}`
      : productId
        ? `product:${productId}`
        : `run:${runId}`;

  const { data, loading, error, displayTeam, handoff, retry } = useWarRoomTeam(
    fetchTeam,
    scopeKey,
    runId,
    { enabled: isLive && Boolean(orgUnitId || departmentSlug || productId), enableLiveNotes: true },
  );

  if (!isLive) {
    return null;
  }

  if (!orgUnitId && !departmentSlug && !productId) {
    return (
      <section className="office-encargo-live-panel office-panel">
        <h2 className="office-panel-title">{t("office.trabajo.live.title")}</h2>
        <p className="office-panel-subtitle">{t("office.trabajo.live.noScope")}</p>
        <Link to={`/office/encargos/${runId}`} className="office-link-btn inline-flex">
          {t("office.trabajo.live.viewDetail")} →
        </Link>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="office-encargo-live-panel office-panel">
        <p className="office-empty">{t("warRoom.loading")}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="office-encargo-live-panel office-panel" role="alert">
        <p className="office-dept-war-room-error-title">{t("warRoom.loadErrorTitle")}</p>
        <p className="office-dept-war-room-error-body">{error}</p>
        <button type="button" className="office-link-btn" onClick={retry}>
          {t("warRoom.retry")}
        </button>
      </section>
    );
  }

  const activeRun = data?.activeRun;
  const activeRunVeto = activeRun?.errorMessage?.startsWith("VETO:") ? activeRun.errorMessage : null;
  const coreLabel = title ?? activeRun?.workflowName ?? t("office.trabajo.live.title");

  return (
    <section className="office-encargo-live-panel office-panel" aria-live="polite">
      <div className="office-encargo-live-header">
        <div>
          <h2 className="office-panel-title">{t("office.trabajo.live.title")}</h2>
          {productName ? (
            <p className="office-panel-subtitle">{productName}</p>
          ) : null}
        </div>
        <div className="office-encargo-live-actions">
          <Link to={`/office/encargos/${runId}`} className="office-link-btn">
            {t("office.trabajo.live.viewDetail")} →
          </Link>
          {warRoomHref ? (
            <Link to={warRoomHref} className="office-link-btn">
              <Crosshair className="h-4 w-4" aria-hidden />
              {t("office.trabajo.live.openWarRoom")}
            </Link>
          ) : null}
        </div>
      </div>

      {activeRunVeto ? <WarRoomVetoBanner message={activeRunVeto} /> : null}

      <WarRoomTable
        agents={displayTeam.map((agent) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          currentTask: agent.currentTask,
        }))}
        core={{
          label: coreLabel,
          name: activeRun?.workflowName ?? title ?? runId.slice(0, 8),
          status: activeRun?.status ?? phase ?? "RUNNING",
          task: activeRun?.task ?? null,
        }}
        handoff={handoff}
        handoffAgentNames={teamAgents.map((name) => agentDisplayLabel({ name }, t))}
        density="cozy"
        enableFullscreen
      />
    </section>
  );
}
