import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { api, type ProductTeam, type TeamAgent, type TeamAgentStatus } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

const ROLE_EMOJI: Record<string, string> = {
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

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 55%) 0%, hsl(${(hue + 40) % 360} 70% 45%) 100%)`;
}

function statusEmoji(s: TeamAgentStatus): string {
  if (s === "thinking") return "💡";
  if (s === "queued") return "⏳";
  return "🟢";
}

function statusLabelKey(s: TeamAgentStatus): string {
  if (s === "thinking") return "team.status.thinking";
  if (s === "queued") return "team.status.queued";
  return "team.status.idle";
}

function shortTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleString();
}

export default function ProductTeamPage() {
  const { t } = useTranslation();
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  const [data, setData] = useState<ProductTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api.products
      .team(productId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [productId, tick]);

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) return <PageLoading message={t("warRoom.loading")} />;
  if (!productId) return <div>Missing product id</div>;

  const thinking = data.team.filter((a) => a.status === "thinking");
  const idle = data.team.filter((a) => a.status === "idle");
  const queued = data.team.filter((a) => a.status === "queued");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t("warRoom.title", { name: data.product.name })}
        subtitle={t("warRoom.subtitle")}
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge>{data.product.phase}</Badge>
        {data.activeRun && (
          <Link
            to={`/runs/${data.activeRun.id}`}
            className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            {t("warRoom.activeRun", { workflow: data.activeRun.workflowName })}
          </Link>
        )}
        {!data.activeRun && (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {t("warRoom.allIdle")}
          </span>
        )}
        <Link
          to={`/products/${data.product.id}/code`}
          className="text-[var(--color-primary)] hover:underline"
        >
          {t("warRoom.viewCode")}
        </Link>
      </div>

      {data.activeRun && (
        <Card className="border-blue-300 bg-blue-50/60">
          <p className="text-xs uppercase tracking-wide text-blue-700">
            {t("warRoom.runningNow")}
          </p>
          <p className="text-sm font-semibold">{data.activeRun.workflowName}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {t("warRoom.startedAt", { date: shortTime(data.activeRun.startedAt) })}
          </p>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {t("warRoom.workingNow", { count: thinking.length + queued.length })}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...thinking, ...queued, ...idle].map((a) => (
            <AgentDesk key={a.id} agent={a} />
          ))}
        </div>
      </section>

      {data.recentRuns.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("warRoom.recentRuns")}
          </h2>
          <Card className="space-y-2 p-3">
            {data.recentRuns.map((r) => (
              <Link
                key={r.id}
                to={`/runs/${r.id}`}
                className="interactive flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-sm hover:border-[var(--color-primary)]"
              >
                <div>
                  <p className="font-medium">{r.workflowName}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {shortTime(r.startedAt)} · {r.totalTokens.toLocaleString()} tokens
                  </p>
                </div>
                <Badge>{r.status}</Badge>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function AgentDesk({ agent }: { agent: TeamAgent }) {
  const { t } = useTranslation();
  const emoji = ROLE_EMOJI[agent.name] ?? "🧑‍💼";
  const initial = agent.name.charAt(0).toUpperCase();

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 ${
        agent.status === "thinking"
          ? "border-blue-400 bg-blue-50/40 shadow-md"
          : agent.status === "queued"
            ? "border-amber-300 bg-amber-50/30"
            : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
      data-testid={`desk-${agent.name}`}
    >
      {agent.status === "thinking" && (
        <span
          className="absolute right-2 top-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-blue-500"
          aria-label="thinking"
        />
      )}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white shadow-sm"
          style={{ background: avatarColor(agent.name) }}
          aria-hidden="true"
        >
          {emoji}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{agent.name}</p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">{agent.role}</p>
        </div>
        <span
          className="ml-auto rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 text-[10px] font-semibold uppercase"
          title={t(statusLabelKey(agent.status))}
        >
          {statusEmoji(agent.status)} {t(statusLabelKey(agent.status))}
        </span>
      </div>

      <div className="mt-3 min-h-[60px]">
        {agent.status === "thinking" && agent.currentTask ? (
          <p className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
            <span className="font-semibold">{t("warRoom.doing")}:</span> {agent.currentTask}
          </p>
        ) : agent.lastMessage ? (
          <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-xs text-[var(--color-muted-foreground)]">
            {agent.lastMessage}
          </p>
        ) : (
          <p className="text-xs italic text-[var(--color-muted-foreground)]">
            {t("warRoom.noRecentActivity")}
          </p>
        )}
      </div>

      <p className="mt-2 text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {t("warRoom.lastWorked")}: {shortTime(agent.lastWorkedAt)}
      </p>
      <span className="sr-only">{initial}</span>
    </div>
  );
}