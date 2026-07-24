import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api, type ProductTeam, type TenantProduct, type TeamAgent, type TeamAgentStatus } from "../../lib/api";
import PageLoading from "../ui/PageLoading";
import Badge from "../ui/Badge";
import KpiCard from "../ui/KpiCard";
import ProductActionsMenu from "../ui/ProductActionsMenu";
import OpencodeHistoryPanel from "../opencode/OpencodeHistoryPanel";
import ProductWorkLauncher from "../products/ProductWorkLauncher";

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

export interface WarRoomContentProps {
  productId: string;
  watchRunId?: string | null;
}

export default function WarRoomContent({ productId, watchRunId }: WarRoomContentProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<ProductTeam | null>(null);
  const [loading, setLoading] = useState(true);
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
    return fresh;
  }, [productId, watchRunId]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [productId, refresh]);

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
        void refresh();
      } else if (evt.type === "step_start" || evt.type === "step_complete") {
        void refresh();
      } else if (evt.type === "done") {
        void refresh();
      }
    });
    return () => close();
  }, [data?.activeRun?.id, data?.activeRun?.status, data?.team, refresh, flashNote]);

  if (loading || !data) return <PageLoading message={t("warRoom.loading")} />;

  const thinking = data.team.filter((a) => a.status === "thinking");
  const onDuty = data.team.filter((a) => a.status !== "idle");
  const totalAgents = data.team.length;

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
            <Link to={`/runs/${data.activeRun.id}`} className="war-room-pill war-room-pill-live">
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
            to={`/products/${data.product.id}/consensus?tab=reports`}
            className="war-room-pill war-room-pill-link"
          >
            {t("warRoom.viewReports")}
          </Link>
        </div>
      </header>

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

      <ProductWorkLauncher
        productId={data.product.id}
        productName={data.product.name}
        afterLaunch="stay"
        onLaunched={(runId) => {
          flashNote(t("warRoom.runStarted"));
          void refresh();
          void api.runs.get(runId).then(() => refresh()).catch(() => refresh());
          window.setTimeout(() => void refresh(), 800);
          window.setTimeout(() => void refresh(), 2500);
        }}
      />

      <div className="war-room-grid">
        <aside className="war-room-radar">
          <h2 className="war-room-section-title">{t("warRoom.radar")}</h2>
          {data.pipeline.length === 0 ? (
            <p className="war-room-empty">{t("warRoom.radarEmpty")}</p>
          ) : (
            <ul className="war-room-radar-list">
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
        </aside>

        <section className="war-room-table" aria-label={t("warRoom.tableAria")}>
          <div className="war-room-table-grid" />
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
            {liveNote && (
              <p className="war-room-core-note" role="status">
                <span className="war-room-pulse" aria-hidden /> {liveNote}
              </p>
            )}
          </div>
          {data.team.map((agent, i) => (
            <AgentSeat key={agent.id} agent={agent} index={i} total={totalAgents} />
          ))}
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

      <OpencodeHistoryPanel productId={productId} />

      <section className="war-room-runs">
        <h2 className="war-room-section-title">{t("warRoom.recentRuns")}</h2>
        <ol className="war-room-runs-list">
          {data.recentRuns.length === 0 ? (
            <li className="war-room-empty">{t("warRoom.noRuns")}</li>
          ) : (
            data.recentRuns.map((r) => (
              <li key={r.id}>
                <Link to={`/runs/${r.id}`} className="war-room-run-row">
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
  const radiusPct = total <= 4 ? 38 : total <= 8 ? 42 : total <= 12 ? 45 : 47;
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
