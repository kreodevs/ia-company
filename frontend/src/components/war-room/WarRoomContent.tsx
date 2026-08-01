import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api, type TenantProduct } from "../../lib/api";
import { formatWorkflowTitle } from "../../lib/workflow-display";
import PageLoading from "../ui/PageLoading";
import Badge from "../ui/Badge";
import KpiCard from "../ui/KpiCard";
import ProductActionsMenu from "../ui/ProductActionsMenu";
import OpencodeHistoryPanel from "../opencode/OpencodeHistoryPanel";
import OpencodeRunPanel from "../opencode/OpencodeRunPanel";
import CoordinatorChat from "../office/CoordinatorChat";
import DeliverableHealthBanner from "./DeliverableHealthBanner";
import ProductHealthPanel from "./ProductHealthPanel";
import ProductMetricsStrip from "./ProductMetricsStrip";
import OrgArtifactsPanel from "../org/OrgArtifactsPanel";
import WarRoomRunSelector from "./WarRoomRunSelector";
import WarRoomRecentRuns from "./WarRoomRecentRuns";
import WarRoomTable from "./WarRoomTable";
import WarRoomBriefingBar from "./WarRoomBriefingBar";
import WarRoomVetoBanner, { resolveWarRoomVetoMessage } from "./WarRoomVetoBanner";
import { WarRoomMainShell } from "./WarRoomCoordinatorAside";
import { WAR_ROOM_COORDINATOR_STORAGE_KEYS } from "./war-room-coordinator-state";
import { useWarRoomTeam } from "./hooks/useWarRoomTeam";

export interface WarRoomContentProps {
  productId: string;
  watchRunId?: string | null;
  onWatchRunChange?: (runId: string | null) => void;
}

export default function WarRoomContent({ productId, watchRunId, onWatchRunChange }: WarRoomContentProps) {
  const { t } = useTranslation();

  const fetchTeam = useCallback(
    () => api.products.team(productId, watchRunId ?? undefined),
    [productId, watchRunId],
  );

  const {
    data,
    loading,
    error: loadError,
    displayTeam,
    handoff,
    liveNote,
    refresh,
    scheduleRefresh,
    flushRefresh,
    retry,
  } = useWarRoomTeam(fetchTeam, `product:${productId}`, watchRunId, { enableLiveNotes: true });

  const flashRunStarted = useCallback(() => {
    scheduleRefresh(800);
    window.setTimeout(() => scheduleRefresh(800), 3000);
  }, [scheduleRefresh]);

  if (loading) return <PageLoading message={t("warRoom.loading")} />;

  if (loadError || !data) {
    return (
      <div className="war-room">
        <div
          className="rounded-xl border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 px-4 py-4"
          role="alert"
        >
          <p className="font-medium">{t("warRoom.loadErrorTitle", { defaultValue: "Could not load war room" })}</p>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            {loadError ?? t("warRoom.loadErrorUnknown", { defaultValue: "Unknown error" })}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-[var(--color-primary)] hover:underline"
            onClick={retry}
          >
            {t("warRoom.retry", { defaultValue: "Try again" })}
          </button>
        </div>
      </div>
    );
  }

  const vetoMessage = resolveWarRoomVetoMessage(data.activeRun, data.recentRuns);
  const thinking = displayTeam.filter((agent) => agent.status === "thinking");
  const onDuty = displayTeam.filter((agent) => agent.status !== "idle");
  const activeRuns = data.activeRuns ?? [];

  return (
    <div className="war-room">
      <header className="war-room-header">
        <div>
          <p className="war-room-eyebrow">{t("warRoom.eyebrow")}</p>
          <h1 className="war-room-title">{t("warRoom.title", { name: data.product.name })}</h1>
          <p className="war-room-subtitle">{t("warRoom.subtitle")}</p>
        </div>
        <div className="war-room-header-meta">
          <Badge>{data.product.phase}</Badge>
          {data.orgUnit ? (
            <Link
              to={`/org-units/${data.orgUnit.id}`}
              className="war-room-pill text-xs text-[var(--color-primary)] hover:underline"
            >
              {t("warRoom.departmentLink", { name: data.orgUnit.name })}
            </Link>
          ) : null}
          <ProductActionsMenu product={data.product as TenantProduct} onChange={() => void refresh()} />
          {data.activeRun ? (
            <Link to={`/office/encargos/${data.activeRun.id}`} className="war-room-pill war-room-pill-live">
              <span className="war-room-pulse" aria-hidden />
              {data.activeRun.status === "DELEGATED"
                ? t("opencode.externalImplementation")
                : t("warRoom.liveRun", { workflow: formatWorkflowTitle(data.activeRun.workflowName) })}
            </Link>
          ) : null}
          {data.activeRun?.opencode ? (
            <span className="war-room-pill war-room-pill-link">{t("opencode.activeBadge")}</span>
          ) : null}
          <span className="war-room-pill war-room-pill-duty">
            {t("warRoom.onDuty", { count: onDuty.length })}
          </span>
          <Link to={`/products/${data.product.id}/desk`} className="war-room-pill war-room-pill-link">
            {t("productDesk.title")}
          </Link>
          <Link to={`/products/${data.product.id}/code`} className="war-room-pill war-room-pill-link">
            {t("warRoom.viewCode")}
          </Link>
          <Link to={`/products/${data.product.id}/settings`} className="war-room-pill war-room-pill-link">
            {t("warRoom.settings")}
          </Link>
        </div>
      </header>

      {vetoMessage ? <WarRoomVetoBanner message={vetoMessage} /> : null}

      <ProductMetricsStrip metrics={data.metrics} productId={productId} />

      <ProductHealthPanel
        trace={data.lastRunTrace}
        productId={productId}
        activeRunStatus={data.activeRun?.status ?? null}
      />

      {!["ok", "run_in_progress"].includes(data.lastRunTrace?.diagnosis ?? "") &&
        data.lastRunTrace?.diagnosis !== "munger_veto" && (
          <DeliverableHealthBanner
            trace={data.lastRunTrace}
            productId={productId}
            hideDuringActiveRun
            activeRunStatus={data.activeRun?.status ?? null}
          />
        )}

      {data.orgUnit ? (
        <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
          <OrgArtifactsPanel orgUnitId={data.orgUnit.id} orgUnitName={data.orgUnit.name} />
        </div>
      ) : null}

      {(data.activeRun?.status === "DELEGATED" || data.activeRun?.status === "AWAITING_USER") && (
        <div className="mb-4">
          <OpencodeRunPanel
            runId={data.activeRun.id}
            status={data.activeRun.status}
            onUpdated={() => flushRefresh()}
          />
        </div>
      )}

      <section className="hero-strip">
        <KpiCard label={t("warRoom.kpis.totalAgents")} value={data.team.length} />
        <KpiCard
          label={t("warRoom.kpis.onDuty")}
          value={onDuty.length}
          delta={
            onDuty.length > 0
              ? t("warRoom.kpis.onDutyDelta", { count: onDuty.length })
              : t("warRoom.kpis.allIdle")
          }
        />
        <KpiCard
          label={t("warRoom.kpis.thinking")}
          value={thinking.length}
          trend={thinking.length > 0 ? "up" : "flat"}
        />
        <KpiCard
          label={t("warRoom.kpis.activeRun")}
          value={activeRuns.length > 0 ? activeRuns.length : 0}
          delta={
            activeRuns.length > 1
              ? t("warRoom.kpis.activeRunsDelta", { count: activeRuns.length })
              : data.activeRun
                ? t("warRoom.kpis.activeRunDelta", { workflow: formatWorkflowTitle(data.activeRun.workflowName) })
                : t("warRoom.kpis.standby")
          }
          trend={activeRuns.length > 0 ? "up" : "down"}
        />
      </section>

      <WarRoomMainShell
        storageKey={WAR_ROOM_COORDINATOR_STORAGE_KEYS.product}
        titleId="war-room-coordinator-title"
        panelId="war-room-coordinator-panel"
        subtitle={t("warRoom.coordinator.subtitle", { name: data.product.name })}
        coordinator={
          <CoordinatorChat
            productId={data.product.id}
            orgUnitId={data.orgUnit?.id}
            welcomeMessageKey="warRoom.coordinator.welcome"
            onExecuted={(runId) => {
              onWatchRunChange?.(runId);
              flashRunStarted();
            }}
          />
        }
      >
        <WarRoomTable
          agents={displayTeam}
          handoff={handoff}
          enableFullscreen
          toolbar={
            <>
              <label htmlFor="war-room-run-inline" className="war-room-table-toolbar-label">
                {t("warRoom.runSelector.label")}
              </label>
              <WarRoomRunSelector
                id="war-room-run-inline"
                activeRuns={activeRuns}
                selectedRunId={watchRunId ?? null}
                onSelect={(runId) => onWatchRunChange?.(runId)}
              />
            </>
          }
          core={{
            label: t("warRoom.tacticalCore"),
            name: data.activeRun
              ? formatWorkflowTitle(data.activeRun.workflowName)
              : t("warRoom.standby"),
            status: data.activeRun
              ? t("warRoom.coreRunning", { agents: data.activeRun.agentIds.length })
              : t("warRoom.coreIdle", { count: displayTeam.length }),
            task: data.activeRun?.task,
            liveNote,
          }}
        />
      </WarRoomMainShell>

      <WarRoomBriefingBar
        activeRun={data.activeRun}
        activeRuns={activeRuns}
        thinkingAgent={thinking[0] ?? null}
      />

      <section className="war-room-radar war-room-radar-bottom">
        <h2 className="war-room-section-title">{t("warRoom.radar")}</h2>
        {data.pipeline.length === 0 ? (
          <p className="war-room-empty">{t("warRoom.radarEmpty")}</p>
        ) : (
          <ul className="war-room-radar-list war-room-radar-list-horizontal">
            {data.pipeline.map((idea, index) => (
              <li key={idea.id} className="war-room-radar-item">
                <span className="war-room-radar-blip" data-rank={index % 4} aria-hidden />
                <div className="war-room-radar-body">
                  <p className="war-room-radar-title">{idea.title}</p>
                  <p className="war-room-radar-meta">
                    {t("warRoom.radarScore", { score: idea.interestScore.toFixed(1) })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <OpencodeHistoryPanel productId={productId} />

      {data.recentRuns.length > 0 ? (
        <section className="war-room-runs">
          <WarRoomRecentRuns runs={data.recentRuns} />
        </section>
      ) : (
        <section className="war-room-runs">
          <h2 className="war-room-section-title">{t("warRoom.recentRuns")}</h2>
          <p className="war-room-empty">{t("warRoom.noRuns")}</p>
        </section>
      )}
    </div>
  );
}
