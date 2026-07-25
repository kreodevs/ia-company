import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api, type ProductTeam, type TenantProduct, type TeamAgent, type TeamAgentStatus } from "../../lib/api";
import PageLoading from "../ui/PageLoading";
import Badge from "../ui/Badge";
import KpiCard from "../ui/KpiCard";
import ProductActionsMenu from "../ui/ProductActionsMenu";
import OpencodeHistoryPanel from "../opencode/OpencodeHistoryPanel";
import OpencodeRunPanel from "../opencode/OpencodeRunPanel";
import CoordinatorChat from "../office/CoordinatorChat";
import DeliverableHealthBanner from "./DeliverableHealthBanner";

const ROLE_EMOJI: Record<string, string> = {
  "coordinator-chief": "🎩",
  "ceo-bezos": "👔",
  "cto-vogels": "🛠️",
  "cfo-campbell": "💰",
  "critic-munger": "🧐",
  "research-thompson": "🔍",
  "product-norman": "🧭",
  "interaction-cooper": "🎯",
  "ui-duarte": "🎨",
  "fullstack-dhh": "💻",
  "qa-bach": "🧪",
  "devops-hightower": "🚀",
  "marketing-godin": "📣",
  "operations-pg": "📈",
  "sales-ross": "💼",
};

function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `radial-gradient(circle at 30% 25%, hsl(${hue} 90% 70%) 0%, hsl(${hue} 70% 45%) 55%, hsl(${(hue + 25) % 360} 80% 30%) 100%)`;
}

function statusRingColor(s: TeamAgentStatus): string {
  if (s === "thinking") return "rgba(96, 165, 250, 0.85)";
  if (s === "queued") return "rgba(251, 191, 36, 0.85)";
  return "rgba(148, 163, 184, 0.45)";
}

function positionOnCircle(index: number, total: number, radiusPct: number): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: 50 + Math.cos(angle) * radiusPct,
    y: 50 + Math.sin(angle) * radiusPct,
  };
}

function shortTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const TEAM_REFRESH_MIN_MS = 2500;
/** Keep active agent states visible long enough to read the war-room table. */
const AGENT_STATUS_HOLD_MS = 2800;
const STEP_EVENT_REFRESH_MS = 2800;

function statusPriority(status: TeamAgentStatus): number {
  if (status === "thinking") return 3;
  if (status === "queued") return 2;
  return 1;
}

function seatRadiusPct(total: number): number {
  if (total <= 4) return 36;
  if (total <= 8) return 38;
  if (total <= 12) return 40;
  if (total <= 16) return 38;
  return 34;
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
}

export default function WarRoomContent({ productId, watchRunId }: WarRoomContentProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<ProductTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const tableDensity = totalAgents > 14 ? "compact" : totalAgents > 10 ? "cozy" : "normal";

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
        <div
          className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
          role="status"
        >
          <strong>{t("warRoom.vetoTitle", { defaultValue: "Munger veto — run stopped" })}</strong>
          <p className="mt-1">{activeRunVeto.replace(/^VETO:\s*/, "")}</p>
        </div>
      )}

      <DeliverableHealthBanner
        trace={data.lastRunTrace}
        productId={productId}
        activeRunStatus={data.activeRun?.status ?? null}
      />

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
          value={data.activeRun ? 1 : 0}
          delta={
            data.activeRun
              ? t("warRoom.kpis.activeRunDelta", { workflow: data.activeRun.workflowName })
              : t("warRoom.kpis.standby")
          }
          trend={data.activeRun ? "up" : "down"}
        />
      </section>

      <div className="war-room-main">
        <aside className="war-room-coordinator war-room-coordinator-inline" aria-labelledby="war-room-coordinator-title">
          <h2 id="war-room-coordinator-title" className="war-room-section-title">
            {t("warRoom.coordinator.title")}
          </h2>
          <p className="war-room-coordinator-subtitle">
            {t("warRoom.coordinator.subtitle", { name: data.product.name })}
          </p>
          <div className="war-room-coordinator-panel">
            <CoordinatorChat
              productId={data.product.id}
              welcomeMessageKey="warRoom.coordinator.welcome"
              onExecuted={(runId) => {
                flashNote(t("warRoom.runStarted"));
                refreshScheduler.current.schedule(800);
                window.setTimeout(() => refreshScheduler.current.schedule(800), 3000);
                void api.runs.get(runId).catch(() => undefined);
              }}
            />
          </div>
        </aside>

        <section
          className="war-room-table"
          data-density={tableDensity}
          aria-label={t("warRoom.tableAria")}
        >
          <div className="war-room-table-backdrop" aria-hidden>
            <div className="war-room-table-grid" />
            <div className="war-room-table-ring" />
          </div>
          <div className="war-room-table-stage">
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
              {liveNote && (
                <p className="war-room-core-note" role="status">
                  <span className="war-room-pulse" aria-hidden /> {liveNote}
                </p>
              )}
            </div>
            {displayTeam.map((agent, i) => (
              <AgentSeat key={agent.id} agent={agent} index={i} total={totalAgents} />
            ))}
          </div>
        </section>

        <aside className="war-room-details">
          <h2 className="war-room-section-title">{t("warRoom.briefing")}</h2>
          {data.activeRun ? (
            <div className="war-room-briefing">
              <Link to={`/runs/${data.activeRun.id}`} className="war-room-briefing-link">
                <p className="war-room-briefing-label">{t("warRoom.workflow")}</p>
                <p className="war-room-briefing-name">{data.activeRun.workflowName}</p>
              </Link>
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

          {thinking[0] && (
            <div className="war-room-thinking">
              <p className="war-room-section-subtitle">{t("warRoom.thinking")}</p>
              <p className="war-room-thinking-name">{thinking[0].name}</p>
              <p className="war-room-thinking-task">
                {thinking[0].currentTask ?? t("warRoom.thinkingGeneric")}
              </p>
            </div>
          )}

          <div className="war-room-legend">
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
      </div>

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

function AgentSeat({ agent, index, total }: { agent: TeamAgent; index: number; total: number }) {
  const { t } = useTranslation();
  const radiusPct = seatRadiusPct(total);
  const { x, y } = positionOnCircle(index, total, radiusPct);
  const emoji = ROLE_EMOJI[agent.name] ?? "🧑‍💼";
  const ringColor = statusRingColor(agent.status);

  return (
    <div
      className={`war-room-seat war-room-seat-${agent.status}`}
      data-testid={`seat-${agent.name}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        ["--ring" as string]: ringColor,
      }}
      title={`${agent.name} — ${agent.role} (${t(`warRoom.status.${agent.status}`)})`}
    >
      <span className="war-room-seat-pill" aria-hidden>
        {agent.status === "thinking" && <ThinkingDots />}
        {agent.status === "queued" && <span className="war-room-seat-clock">⏳</span>}
      </span>
      <div className="war-room-seat-avatar" style={{ background: avatarGradient(agent.name) }}>
        <span className="war-room-seat-emoji" aria-hidden>
          {emoji}
        </span>
      </div>
      <p className="war-room-seat-name">{agent.name.replace(/-/g, " ")}</p>
      {agent.status === "thinking" && agent.currentTask && (
        <p className="war-room-seat-task">{agent.currentTask}</p>
      )}
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="war-room-typing" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}
