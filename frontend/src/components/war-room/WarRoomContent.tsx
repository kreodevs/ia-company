import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Maximize2, MessageSquare, Minimize2 } from "lucide-react";
import { api, type ProductTeam, type TenantProduct, type TeamAgent, type TeamAgentStatus } from "../../lib/api";
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
import WarRoomAgentSeat from "./WarRoomAgentSeat";
import WarRoomRunSelector from "./WarRoomRunSelector";
import { shortTime } from "./war-room-shared";

const TEAM_REFRESH_MIN_MS = 2500;
/** Keep active agent states visible long enough to read the war-room table. */
const AGENT_STATUS_HOLD_MS = 2800;
const STEP_EVENT_REFRESH_MS = 2800;
const COORDINATOR_COLLAPSED_KEY = "war-room-coordinator-collapsed";

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
    // ignore quota / private mode
  }
}

function statusPriority(status: TeamAgentStatus): number {
  if (status === "thinking") return 3;
  if (status === "queued") return 2;
  return 1;
}

function useHeldAgentTeam(team: TeamAgent[]): TeamAgent[] {
  const [display, setDisplay] = useState(team);
  const teamRef = useRef(team);
  teamRef.current = team;
  const holdsRef = useRef(new Map<string, { status: TeamAgentStatus; currentTask: string | null; releaseAt: number }>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setDisplay((prevDisplay) => {
      const now = Date.now();
      return team.map((agent) => {
        const prev = prevDisplay.find((entry) => entry.id === agent.id) ?? agent;
        const hold = holdsRef.current.get(agent.id);

        if (hold && now < hold.releaseAt) {
          if (statusPriority(agent.status) > statusPriority(hold.status)) {
            holdsRef.current.delete(agent.id);
            const timer = timersRef.current.get(agent.id);
            if (timer) clearTimeout(timer);
            timersRef.current.delete(agent.id);
            return agent;
          }
          return {
            ...agent,
            status: hold.status,
            currentTask: hold.currentTask ?? agent.currentTask,
          };
        }

        if (statusPriority(prev.status) > statusPriority(agent.status)) {
          const releaseAt = now + AGENT_STATUS_HOLD_MS;
          holdsRef.current.set(agent.id, {
            status: prev.status,
            currentTask: prev.currentTask,
            releaseAt,
          });
          const existing = timersRef.current.get(agent.id);
          if (existing) clearTimeout(existing);
          const agentId = agent.id;
          const timer = setTimeout(() => {
            timersRef.current.delete(agentId);
            holdsRef.current.delete(agentId);
            setDisplay((current) =>
              current.map((entry) =>
                entry.id === agentId ? teamRef.current.find((member) => member.id === agentId) ?? entry : entry,
              ),
            );
          }, AGENT_STATUS_HOLD_MS);
          timersRef.current.set(agent.id, timer);
          return {
            ...agent,
            status: prev.status,
            currentTask: prev.currentTask ?? agent.currentTask,
          };
        }

        return agent;
      });
    });
  }, [team]);

  useEffect(() => {
    if (team.length === 0) {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
      holdsRef.current.clear();
      setDisplay([]);
    }
  }, [team.length]);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
      holdsRef.current.clear();
    };
  }, []);

  return display;
}

function createTeamRefreshScheduler(refresh: () => Promise<unknown>) {
  let inFlight = false;
  let lastAt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const run = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      await refresh();
      lastAt = Date.now();
    } catch {
      // Keep last good snapshot — rate limits should not blank the war room.
    } finally {
      inFlight = false;
    }
  };

  return {
    schedule(minIntervalMs = TEAM_REFRESH_MIN_MS) {
      const elapsed = Date.now() - lastAt;
      if (timer) clearTimeout(timer);

      if (elapsed >= minIntervalMs && !inFlight) {
        void run();
        return;
      }

      timer = setTimeout(() => {
        timer = null;
        void run();
      }, Math.max(minIntervalMs - elapsed, 400));
    },
    flush() {
      if (timer) clearTimeout(timer);
      timer = null;
      void run();
    },
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

export interface WarRoomContentProps {
  productId: string;
  watchRunId?: string | null;
  onWatchRunChange?: (runId: string | null) => void;
}

export default function WarRoomContent({ productId, watchRunId, onWatchRunChange }: WarRoomContentProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<ProductTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const [coordinatorCollapsed, setCoordinatorCollapsed] = useState(readCoordinatorCollapsed);
  const [tableFullscreen, setTableFullscreen] = useState(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleCoordinatorCollapsed = useCallback(() => {
    setCoordinatorCollapsed((prev) => {
      const next = !prev;
      writeCoordinatorCollapsed(next);
      return next;
    });
  }, []);

  const flashNote = useCallback((note: string) => {
    setLiveNote(note);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setLiveNote(null), 4000);
  }, []);

  const refresh = useCallback(async () => {
    const fresh = await api.products.team(productId, watchRunId ?? undefined);
    setData(fresh);
    setLoadError(null);
    return fresh;
  }, [productId, watchRunId]);

  const refreshScheduler = useRef(createTeamRefreshScheduler(() => refresh()));
  useEffect(() => {
    refreshScheduler.current = createTeamRefreshScheduler(() => refresh());
  }, [refresh]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setLoadError(null);
    refresh()
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : String(err));
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [productId, refresh]);

  useEffect(() => {
    if (loading) return;
    void refresh().catch(() => undefined);
  }, [watchRunId, loading, refresh]);

  useEffect(() => {
    if (!tableFullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTableFullscreen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [tableFullscreen]);

  useEffect(() => {
    const active = data?.activeRun;
    if (!active) return;

    const needsPoll =
      active.status === "DELEGATED" ||
      active.status === "AWAITING_USER" ||
      active.status === "RUNNING" ||
      active.status === "PENDING";

    if (!needsPoll) return;

    const intervalMs = active.status === "DELEGATED" ? 4000 : 8000;
    const timer = window.setInterval(() => refreshScheduler.current.schedule(intervalMs), intervalMs);
    return () => window.clearInterval(timer);
  }, [data?.activeRun?.id, data?.activeRun?.status]);

  useEffect(() => {
    if (
      !data?.activeRun ||
      (data.activeRun.status !== "RUNNING" &&
        data.activeRun.status !== "PENDING" &&
        data.activeRun.status !== "DELEGATED" &&
        data.activeRun.status !== "AWAITING_USER")
    ) {
      return;
    }
    const close = api.runs.streamLogs(data.activeRun.id, (raw) => {
      const evt = raw as { type?: string; data?: { agentId?: string | null; message?: string } };
      if (evt.type === "log" && evt.data?.agentId) {
        const agent = data.team.find((a) => a.id === evt.data?.agentId);
        const preview = String(evt.data?.message ?? "").slice(0, 80);
        if (preview) flashNote(agent ? `${agent.name}: ${preview}` : preview);
      } else if (evt.type === "step_start" || evt.type === "step_complete") {
        refreshScheduler.current.schedule(STEP_EVENT_REFRESH_MS);
      } else if (evt.type === "done") {
        refreshScheduler.current.flush();
      }
    });
    return () => {
      close();
      refreshScheduler.current.dispose();
    };
  }, [data?.activeRun?.id, data?.activeRun?.status, data?.team, flashNote]);

  const displayTeam = useHeldAgentTeam(data?.team ?? []);

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
            onClick={() => {
              setLoading(true);
              void refresh()
                .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
                .finally(() => setLoading(false));
            }}
          >
            {t("warRoom.retry", { defaultValue: "Try again" })}
          </button>
        </div>
      </div>
    );
  }

  const recentVeto = data.recentRuns.find((r) => r.errorMessage?.startsWith("VETO:"))?.errorMessage;
  const activeRunVeto =
    data.activeRun?.errorMessage?.startsWith("VETO:") ? data.activeRun.errorMessage : recentVeto ?? null;

  const thinking = displayTeam.filter((a) => a.status === "thinking");
  const onDuty = displayTeam.filter((a) => a.status !== "idle");
  const totalAgents = displayTeam.length;
  const tableDensity = totalAgents > 16 ? "compact" : totalAgents > 12 ? "cozy" : "normal";
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
          {data.orgUnit && (
            <Link
              to={`/org-units/${data.orgUnit.id}`}
              className="war-room-pill text-xs text-[var(--color-primary)] hover:underline"
            >
              {t("warRoom.departmentLink", { name: data.orgUnit.name })}
            </Link>
          )}
          <ProductActionsMenu product={data.product as TenantProduct} onChange={() => void refresh()} />
          {data.activeRun && (
            <Link to={`/office/encargos/${data.activeRun.id}`} className="war-room-pill war-room-pill-live">
              <span className="war-room-pulse" aria-hidden />
              {data.activeRun.status === "DELEGATED"
                ? t("opencode.externalImplementation")
                : t("warRoom.liveRun", { workflow: data.activeRun.workflowName })}
            </Link>
          )}
          {data.activeRun?.opencode && (
            <span className="war-room-pill war-room-pill-link">{t("opencode.activeBadge")}</span>
          )}
          <span className="war-room-pill war-room-pill-duty">
            {t("warRoom.onDuty", { count: onDuty.length })}
          </span>
          <Link to={`/products/${data.product.id}/desk`} className="war-room-pill war-room-pill-link">
            {t("productDesk.title")}
          </Link>
          <Link to={`/products/${data.product.id}/code`} className="war-room-pill war-room-pill-link">
            {t("warRoom.viewCode")}
          </Link>
          <Link
            to={`/products/${data.product.id}/settings`}
            className="war-room-pill war-room-pill-link"
          >
            {t("warRoom.settings")}
          </Link>
        </div>
      </header>

      {activeRunVeto && (
        <div className="mb-4 app-alert app-alert--warning" role="status">
          <strong>{t("warRoom.vetoTitle", { defaultValue: "Munger veto — run stopped" })}</strong>
          <p className="mt-1">{activeRunVeto.replace(/^VETO:\s*/, "")}</p>
        </div>
      )}

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

      {data.orgUnit && (
        <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
          <OrgArtifactsPanel orgUnitId={data.orgUnit.id} orgUnitName={data.orgUnit.name} />
        </div>
      )}

      {(data.activeRun?.status === "DELEGATED" || data.activeRun?.status === "AWAITING_USER") && (
        <div className="mb-4">
          <OpencodeRunPanel
            runId={data.activeRun.id}
            status={data.activeRun.status}
            onUpdated={() => refreshScheduler.current.flush()}
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
                ? t("warRoom.kpis.activeRunDelta", { workflow: data.activeRun.workflowName })
                : t("warRoom.kpis.standby")
          }
          trend={activeRuns.length > 0 ? "up" : "down"}
        />
      </section>

      <div
        className={`war-room-main${coordinatorCollapsed ? " war-room-main--coordinator-collapsed" : ""}`}
      >
        <aside
          className={`war-room-coordinator war-room-coordinator-inline${coordinatorCollapsed ? " is-collapsed" : ""}`}
          aria-labelledby="war-room-coordinator-title"
        >
          {coordinatorCollapsed ? (
            <button
              type="button"
              className="war-room-coordinator-expand"
              onClick={toggleCoordinatorCollapsed}
              aria-label={t("warRoom.coordinator.expand")}
              aria-expanded={false}
              aria-controls="war-room-coordinator-panel"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              <ChevronRight className="h-4 w-4" aria-hidden />
              <span className="war-room-coordinator-expand-label">{t("warRoom.coordinator.title")}</span>
            </button>
          ) : (
            <>
              <div className="war-room-coordinator-header">
                <h2 id="war-room-coordinator-title" className="war-room-section-title">
                  {t("warRoom.coordinator.title")}
                </h2>
                <button
                  type="button"
                  className="war-room-coordinator-collapse"
                  onClick={toggleCoordinatorCollapsed}
                  aria-label={t("warRoom.coordinator.collapse")}
                  aria-expanded
                  aria-controls="war-room-coordinator-panel"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="war-room-coordinator-subtitle">
                {t("warRoom.coordinator.subtitle", { name: data.product.name })}
              </p>
              <div id="war-room-coordinator-panel" className="war-room-coordinator-panel">
                <CoordinatorChat
                  productId={data.product.id}
                  orgUnitId={data.orgUnit?.id}
                  welcomeMessageKey="warRoom.coordinator.welcome"
                  onExecuted={(runId) => {
                    onWatchRunChange?.(runId);
                    flashNote(t("warRoom.runStarted"));
                    refreshScheduler.current.schedule(800);
                    window.setTimeout(() => refreshScheduler.current.schedule(800), 3000);
                    void api.runs.get(runId).catch(() => undefined);
                  }}
                />
              </div>
            </>
          )}
        </aside>

        <div className={`war-room-table-shell${tableFullscreen ? " is-fullscreen" : ""}`}>
          <div className="war-room-table-toolbar">
            <div className="war-room-table-toolbar-main">
              <label htmlFor="war-room-run-inline" className="war-room-table-toolbar-label">
                {t("warRoom.runSelector.label")}
              </label>
              <WarRoomRunSelector
                id="war-room-run-inline"
                activeRuns={activeRuns}
                selectedRunId={watchRunId ?? null}
                onSelect={(runId) => onWatchRunChange?.(runId)}
              />
            </div>
            <button
              type="button"
              className="war-room-fullscreen-btn"
              onClick={() => setTableFullscreen((prev) => !prev)}
              aria-pressed={tableFullscreen}
              aria-label={tableFullscreen ? t("warRoom.exitFullscreen") : t("warRoom.fullscreen")}
            >
              {tableFullscreen ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
              <span>{tableFullscreen ? t("warRoom.exitFullscreen") : t("warRoom.fullscreen")}</span>
            </button>
          </div>

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
                <p className="war-room-core-name">
                  {data.activeRun ? data.activeRun.workflowName : t("warRoom.standby")}
                </p>
                <p className="war-room-core-status">
                  {data.activeRun
                    ? t("warRoom.coreRunning", { agents: data.activeRun.agentIds.length })
                    : t("warRoom.coreIdle", { count: totalAgents })}
                </p>
                {data.activeRun?.task && (
                  <p className="war-room-core-task">{data.activeRun.task}</p>
                )}
                {liveNote && (
                  <p className="war-room-core-note" role="status">
                    <span className="war-room-pulse" aria-hidden /> {liveNote}
                  </p>
                )}
              </div>
              {displayTeam.map((agent, i) => (
                <WarRoomAgentSeat key={agent.id} agent={agent} index={i} total={totalAgents} />
              ))}
            </div>
          </section>
        </div>
      </div>

      <aside className="war-room-details war-room-briefing-bar">
        <div className="war-room-briefing-col">
          <h2 className="war-room-section-title">{t("warRoom.briefing")}</h2>
          {data.activeRun ? (
            <div className="war-room-briefing">
              {activeRuns.length > 1 && (
                <p className="war-room-briefing-meta war-room-briefing-multi">
                  {t("warRoom.runSelector.viewingOneOf", { count: activeRuns.length })}
                </p>
              )}
              <Link to={`/runs/${data.activeRun.id}`} className="war-room-briefing-link">
                <p className="war-room-briefing-label">{t("warRoom.workflow")}</p>
                <p className="war-room-briefing-name">{data.activeRun.workflowName}</p>
              </Link>
              {data.activeRun.task && (
                <p className="war-room-briefing-meta">
                  <span className="font-medium">{t("warRoom.runSelector.task")}: </span>
                  {data.activeRun.task}
                </p>
              )}
              <p className="war-room-briefing-meta">
                {t("warRoom.startedAt", { time: shortTime(data.activeRun.startedAt) })}
              </p>
              <p className="war-room-briefing-meta">
                {t("warRoom.agentsOnRun", { count: data.activeRun.agentIds.length })}
              </p>
            </div>
          ) : (
            <p className="war-room-empty">{t("warRoom.noActiveRun")}</p>
          )}
        </div>

        {thinking[0] && (
          <div className="war-room-thinking war-room-briefing-col">
            <p className="war-room-section-subtitle">{t("warRoom.thinking")}</p>
            <p className="war-room-thinking-name">{thinking[0].name}</p>
            <p className="war-room-thinking-task">
              {thinking[0].currentTask ?? t("warRoom.thinkingGeneric")}
            </p>
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
        <h2 className="war-room-section-title">{t("warRoom.radar")}</h2>
        {data.pipeline.length === 0 ? (
          <p className="war-room-empty">{t("warRoom.radarEmpty")}</p>
        ) : (
          <ul className="war-room-radar-list war-room-radar-list-horizontal">
            {data.pipeline.map((idea, i) => (
              <li key={idea.id} className="war-room-radar-item">
                <span className="war-room-radar-blip" data-rank={i % 4} aria-hidden />
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

      <section className="war-room-runs">
        <h2 className="war-room-section-title">{t("warRoom.recentRuns")}</h2>
        <ol className="war-room-runs-list">
          {data.recentRuns.length === 0 ? (
            <li className="war-room-empty">{t("warRoom.noRuns")}</li>
          ) : (
            data.recentRuns.map((r) => (
              <li key={r.id}>
                <Link to={`/office/encargos/${r.id}`} className="war-room-run-row">
                  <span className="war-room-run-name">{r.workflowName}</span>
                  <span className="war-room-run-meta">
                    {shortTime(r.startedAt)} · {r.totalTokens.toLocaleString()} tokens
                  </span>
                  <Badge>{r.status}</Badge>
                </Link>
              </li>
            ))
          )}
        </ol>
      </section>
    </div>
  );
}
