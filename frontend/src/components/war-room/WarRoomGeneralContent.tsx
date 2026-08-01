import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import {
  api,
  type OfficeDashboard,
  type OfficeEncargoSummary,
  type TenantProduct,
} from "../../lib/api";
import { encargoContextLine } from "../../lib/office-encargo-display";
import CoordinatorChat from "../office/CoordinatorChat";
import PageLoading from "../ui/PageLoading";
import Badge from "../ui/Badge";
import KpiCard from "../ui/KpiCard";
import WarRoomAgentSeat from "./WarRoomAgentSeat";
import { shortTime, type WarRoomSeatAgent } from "./war-room-shared";

const COORDINATOR_COLLAPSED_KEY = "war-room-general-coordinator-collapsed";

function readCoordinatorCollapsed(): boolean {
  try {
    return localStorage.getItem(COORDINATOR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCoordinatorCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(COORDINATOR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore
  }
}

interface WarRoomGeneralContentProps {
  products: TenantProduct[];
  watchRunId?: string | null;
}

export default function WarRoomGeneralContent({ products, watchRunId }: WarRoomGeneralContentProps) {
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<OfficeDashboard | null>(null);
  const [encargos, setEncargos] = useState<OfficeEncargoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [coordinatorCollapsed, setCoordinatorCollapsed] = useState(readCoordinatorCollapsed);

  const refresh = useCallback(async () => {
    const [dash, encargoRes] = await Promise.all([
      api.office.dashboard(),
      api.office.encargos({ phase: "in_progress", limit: 12 }),
    ]);
    setDashboard(dash);
    setEncargos(encargoRes.items);
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!dashboard?.stats.activeRuns) return;
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [dashboard?.stats.activeRuns, refresh]);

  const toggleCoordinatorCollapsed = useCallback(() => {
    setCoordinatorCollapsed((prev) => {
      const next = !prev;
      writeCoordinatorCollapsed(next);
      return next;
    });
  }, []);

  const seatAgents = useMemo<WarRoomSeatAgent[]>(() => {
    if (!dashboard) return [];
    return dashboard.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status === "busy" ? "thinking" : "idle",
    }));
  }, [dashboard]);

  const onDuty = seatAgents.filter((agent) => agent.status !== "idle");
  const thinking = seatAgents.filter((agent) => agent.status === "thinking");
  const totalAgents = seatAgents.length;
  const tableDensity = totalAgents > 16 ? "compact" : totalAgents > 12 ? "cozy" : "normal";
  const highlightedEncargo = watchRunId ? encargos.find((item) => item.id === watchRunId) : null;

  if (loading || !dashboard) {
    return <PageLoading message={t("warRoom.loading")} />;
  }

  return (
    <div className="war-room">
      <header className="war-room-header">
        <div>
          <p className="war-room-eyebrow">{t("warRoom.eyebrow")}</p>
          <h1 className="war-room-title">{t("warRoom.general.title")}</h1>
          <p className="war-room-subtitle">{t("warRoom.general.subtitle")}</p>
        </div>
        <div className="war-room-header-meta">
          <span className="war-room-pill war-room-pill-duty">
            {t("warRoom.onDuty", { count: onDuty.length })}
          </span>
          {dashboard.stats.activeRuns > 0 && (
            <Link to="/office/encargos" className="war-room-pill war-room-pill-live">
              <span className="war-room-pulse" aria-hidden />
              {t("warRoom.general.activeRunsPill", { count: dashboard.stats.activeRuns })}
            </Link>
          )}
          <Link to="/office" className="war-room-pill war-room-pill-link">
            {t("nav.office")}
          </Link>
          <Link to="/office/encargos" className="war-room-pill war-room-pill-link">
            {t("nav.encargos")}
          </Link>
        </div>
      </header>

      <section className="hero-strip">
        <KpiCard label={t("warRoom.kpis.totalAgents")} value={totalAgents} />
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
          value={dashboard.stats.activeRuns}
          delta={
            dashboard.stats.activeRuns > 0
              ? t("warRoom.kpis.activeRunsDelta", { count: dashboard.stats.activeRuns })
              : t("warRoom.kpis.standby")
          }
          trend={dashboard.stats.activeRuns > 0 ? "up" : "down"}
        />
      </section>

      <div
        className={`war-room-main${coordinatorCollapsed ? " war-room-main--coordinator-collapsed" : ""}`}
      >
        <aside
          className={`war-room-coordinator war-room-coordinator-inline${coordinatorCollapsed ? " is-collapsed" : ""}`}
          aria-labelledby="war-room-general-coordinator-title"
        >
          {coordinatorCollapsed ? (
            <button
              type="button"
              className="war-room-coordinator-expand"
              onClick={toggleCoordinatorCollapsed}
              aria-label={t("warRoom.coordinator.expand")}
              aria-expanded={false}
              aria-controls="war-room-general-coordinator-panel"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              <ChevronRight className="h-4 w-4" aria-hidden />
              <span className="war-room-coordinator-expand-label">{t("warRoom.coordinator.title")}</span>
            </button>
          ) : (
            <>
              <div className="war-room-coordinator-header">
                <h2 id="war-room-general-coordinator-title" className="war-room-section-title">
                  {t("warRoom.coordinator.title")}
                </h2>
                <button
                  type="button"
                  className="war-room-coordinator-collapse"
                  onClick={toggleCoordinatorCollapsed}
                  aria-label={t("warRoom.coordinator.collapse")}
                  aria-expanded
                  aria-controls="war-room-general-coordinator-panel"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="war-room-coordinator-subtitle">{t("warRoom.general.coordinator.subtitle")}</p>
              <div id="war-room-general-coordinator-panel" className="war-room-coordinator-panel">
                <CoordinatorChat
                  welcomeMessageKey="warRoom.general.coordinator.welcome"
                  onExecuted={() => void refresh()}
                />
              </div>
            </>
          )}
        </aside>

        <div className="war-room-table-shell">
          <section
            className="war-room-table"
            data-density={tableDensity}
            aria-label={t("warRoom.tableAria")}
          >
            <div className="war-room-table-backdrop" aria-hidden>
              <div className="war-room-table-grid" />
            </div>
            <div className="war-room-table-stage">
              <div className="war-room-table-ring" aria-hidden />
              <div className="war-room-core">
                <p className="war-room-core-label">{t("warRoom.tacticalCore")}</p>
                <p className="war-room-core-name">{t("warRoom.general.portfolioCore")}</p>
                <p className="war-room-core-status">
                  {dashboard.stats.activeRuns > 0
                    ? t("warRoom.general.coreRunning", { count: dashboard.stats.activeRuns })
                    : t("warRoom.coreIdle", { count: totalAgents })}
                </p>
                {highlightedEncargo && (
                  <p className="war-room-core-task">{highlightedEncargo.title || highlightedEncargo.request}</p>
                )}
              </div>
              {seatAgents.map((agent, index) => (
                <WarRoomAgentSeat key={agent.id} agent={agent} index={index} total={totalAgents} />
              ))}
            </div>
          </section>
        </div>
      </div>

      <aside className="war-room-details war-room-briefing-bar">
        <div className="war-room-briefing-col">
          <h2 className="war-room-section-title">{t("warRoom.briefing")}</h2>
          {encargos.length === 0 ? (
            <p className="war-room-empty">{t("warRoom.general.noActiveEncargos")}</p>
          ) : (
            <div className="war-room-briefing">
              <p className="war-room-briefing-meta">
                {t("warRoom.general.activeEncargos", { count: encargos.length })}
              </p>
              {encargos.slice(0, 3).map((encargo) => (
                <Link
                  key={encargo.id}
                  to={
                    encargo.productId
                      ? `/war-room/${encargo.productId}?run=${encodeURIComponent(encargo.id)}`
                      : `/war-room?run=${encodeURIComponent(encargo.id)}`
                  }
                  className="war-room-briefing-link"
                >
                  <p className="war-room-briefing-name">{encargo.title}</p>
                  <p className="war-room-briefing-meta">
                    {encargoContextLine(encargo, t)} ·{" "}
                    {encargo.productName ?? t("warRoom.general.noProduct")} · {shortTime(encargo.startedAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {thinking[0] && (
          <div className="war-room-thinking war-room-briefing-col">
            <p className="war-room-section-subtitle">{t("warRoom.thinking")}</p>
            <p className="war-room-thinking-name">{thinking[0].name}</p>
            <p className="war-room-thinking-task">{t("warRoom.thinkingGeneric")}</p>
          </div>
        )}

        <div className="war-room-legend war-room-briefing-col">
          <p className="war-room-section-subtitle">{t("warRoom.legend")}</p>
          <ul>
            <li>
              <span className="war-room-dot" data-status="thinking" />
              {t("warRoom.status.thinking")}
            </li>
            <li>
              <span className="war-room-dot" data-status="queued" />
              {t("warRoom.status.queued")}
            </li>
            <li>
              <span className="war-room-dot" data-status="idle" />
              {t("warRoom.status.idle")}
            </li>
          </ul>
        </div>
      </aside>

      <section className="war-room-radar war-room-radar-bottom">
        <h2 className="war-room-section-title">{t("warRoom.general.productsTitle")}</h2>
        <ul className="war-room-radar-list war-room-radar-list-horizontal">
          {products.map((product, index) => {
            const roi = dashboard.roi.find((item) => item.id === product.id);
            return (
              <li key={product.id} className="war-room-radar-item">
                <span className="war-room-radar-blip" data-rank={index % 4} aria-hidden />
                <div className="war-room-radar-body">
                  <p className="war-room-radar-title">{product.name}</p>
                  <p className="war-room-radar-meta">
                    {product.phase}
                    {roi?.runsCount != null ? ` · ${roi.runsCount} runs` : ""}
                  </p>
                  <Link to={`/war-room/${product.id}`} className="war-room-product-link">
                    {t("warRoom.general.openWarRoom")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="war-room-runs">
        <h2 className="war-room-section-title">{t("warRoom.general.recentActivity")}</h2>
        <ol className="war-room-runs-list">
          {dashboard.activity.length === 0 ? (
            <li className="war-room-empty">{t("office.activity.empty")}</li>
          ) : (
            dashboard.activity.slice(0, 8).map((item) => (
              <li key={item.id}>
                {item.href ? (
                  <Link to={item.href} className="war-room-run-row">
                    <span className="war-room-run-name">{item.title}</span>
                    <span className="war-room-run-meta">
                      {shortTime(item.timestamp)}
                      {item.costUsd != null ? ` · $${item.costUsd.toFixed(2)}` : ""}
                    </span>
                    {item.status ? <Badge>{item.status}</Badge> : null}
                  </Link>
                ) : (
                  <div className="war-room-run-row">
                    <span className="war-room-run-name">{item.title}</span>
                    <span className="war-room-run-meta">{shortTime(item.timestamp)}</span>
                  </div>
                )}
              </li>
            ))
          )}
        </ol>
      </section>
    </div>
  );
}
