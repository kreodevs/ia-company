import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Archive, Send, RefreshCw, Play, Sparkles } from "lucide-react";
import {
  api,
  type DeskItemDto,
  type ProductDeskBoard,
  type ProductPlaybookDto,
  type ProductRoadmapBoard,
  type ProductSignalDto,
  type ProductSignalSummary,
  type TenantProduct,
} from "../lib/api";
import { toast } from "../components/molecules/Sonner";
import { translateApiError } from "../lib/translate-error";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

type DeskTab = "desk" | "roadmap" | "signals" | "playbooks";

function playbookIdFromItem(item: DeskItemDto): string | null {
  if (item.playbookId) return item.playbookId;
  const fromMeta = item.sourceMeta?.playbookId;
  return typeof fromMeta === "string" ? fromMeta : null;
}

function DeskItemCard({
  item,
  zone,
  onApprove,
  onArchive,
  onDispatch,
  onRunPlaybook,
  busy,
}: {
  item: DeskItemDto;
  zone: keyof ProductDeskBoard;
  onApprove?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDispatch?: (id: string, agentId?: string) => void;
  onRunPlaybook?: (playbookId: string) => void;
  busy: string | null;
}) {
  const { t } = useTranslation();
  const isBusy = busy === item.id;
  const isRecommendation = item.sourceKind === "recommendation";
  const playbookId = playbookIdFromItem(item);

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap gap-1">
            <Badge variant="default">{item.humanTypeLabel}</Badge>
            {isRecommendation ? (
              <Badge variant="default">{t("productDesk.recommendation")}</Badge>
            ) : null}
          </div>
          <h3 className="font-medium text-sm">{item.title}</h3>
          {item.previewText ? (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{item.previewText}</p>
          ) : null}
        </div>
        {item.runId ? (
          <Link
            to={`/office/encargos/${item.runId}`}
            className="text-xs text-primary hover:underline shrink-0"
          >
            {t("productDesk.viewRun")}
          </Link>
        ) : null}
      </div>

      {zone === "forYou" ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {isRecommendation && playbookId ? (
            <Button size="sm" disabled={isBusy} onClick={() => onRunPlaybook?.(playbookId)}>
              <Play className="h-3.5 w-3.5 mr-1" />
              {t("productDesk.runPlaybook")}
            </Button>
          ) : (
            <Button size="sm" disabled={isBusy} onClick={() => onApprove?.(item.id)}>
              <Check className="h-3.5 w-3.5 mr-1" />
              {t("productDesk.approve")}
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => onArchive?.(item.id)}>
            <Archive className="h-3.5 w-3.5 mr-1" />
            {t("productDesk.archive")}
          </Button>
        </div>
      ) : null}

      {zone === "ready" ? (
        <div className="space-y-2 pt-1">
          {item.eligibleAgents.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("productDesk.eligibleCount", { count: item.eligibleAgents.length })}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {(item.eligibleAgents.length > 0
              ? item.eligibleAgents.slice(0, 3)
              : [{ id: "", name: item.suggestedNextRole ?? "agent", role: "" }]
            ).map((agent) => (
              <Button
                key={agent.id || agent.name}
                size="sm"
                disabled={isBusy || !agent.id}
                onClick={() => onDispatch?.(item.id, agent.id || undefined)}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {agent.id
                  ? t("productDesk.sendTo", { name: agent.name })
                  : t("productDesk.sendToSuggested")}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DeskZone({
  title,
  empty,
  items,
  zone,
  onApprove,
  onArchive,
  onDispatch,
  onRunPlaybook,
  busy,
}: {
  title: string;
  empty: string;
  items: DeskItemDto[];
  zone: keyof ProductDeskBoard;
  onApprove?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDispatch?: (id: string, agentId?: string) => void;
  onRunPlaybook?: (playbookId: string) => void;
  busy: string | null;
}) {
  return (
    <Panel className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="default">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <DeskItemCard
              key={item.id}
              item={item}
              zone={zone}
              onApprove={onApprove}
              onArchive={onArchive}
              onDispatch={onDispatch}
              onRunPlaybook={onRunPlaybook}
              busy={busy}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function RoadmapColumn({
  title,
  empty,
  items,
  columnKey,
  onMove,
  busy,
}: {
  title: string;
  empty: string;
  items: DeskItemDto[];
  columnKey: keyof ProductRoadmapBoard;
  onMove: (itemId: string, column: string) => void;
  busy: string | null;
}) {
  const { t } = useTranslation();
  const nextColumn: Record<keyof ProductRoadmapBoard, string | null> = {
    backlog: "approved",
    approved: "in_progress",
    inProgress: "done",
    done: null,
  };
  const next = nextColumn[columnKey];
  const nextLabel =
    next === "approved"
      ? t("productDesk.roadmap.approved")
      : next === "in_progress"
        ? t("productDesk.roadmap.inProgress")
        : next === "done"
          ? t("productDesk.roadmap.done")
          : "";

  return (
    <Panel className="space-y-3 min-h-[200px]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="default">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-border/50 p-3 space-y-2">
              <p className="text-sm font-medium">{item.title}</p>
              <Badge variant="default">{item.humanTypeLabel}</Badge>
              {next ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === item.id}
                  onClick={() => onMove(item.id, next)}
                >
                  {t("productDesk.roadmap.moveTo", { column: nextLabel })}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function SignalsPanel({
  summary,
  signals,
}: {
  summary: ProductSignalSummary;
  signals: ProductSignalDto[];
}) {
  const { t } = useTranslation();
  const metrics = [
    { label: t("productDesk.signals.revenue"), value: `$${summary.revenueUsd.toFixed(2)}` },
    { label: t("productDesk.signals.waitlist"), value: String(summary.waitlistCount) },
    { label: t("productDesk.signals.revenue30d"), value: String(summary.revenueEvents30d) },
    { label: t("productDesk.signals.waitlist30d"), value: String(summary.waitlistSignups30d) },
    { label: t("productDesk.signals.campaign30d"), value: String(summary.campaignSignals30d) },
    {
      label: t("productDesk.signals.daysSinceRevenue"),
      value: summary.daysSinceLastRevenue !== null ? String(summary.daysSinceLastRevenue) : "—",
    },
    {
      label: t("productDesk.signals.pricingCycles"),
      value: String(summary.pricingCyclesWithoutRevenue),
    },
  ];

  return (
    <div className="space-y-4">
      <Panel className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">{t("productDesk.signals.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("productDesk.signals.subtitle")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-lg font-semibold mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="space-y-3">
        <h2 className="text-sm font-semibold">{t("productDesk.signals.recent")}</h2>
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("productDesk.signals.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {signals.map((s) => (
              <li key={s.id} className="text-sm border-b border-border/40 pb-2 last:border-0">
                <span className="font-medium">{s.title}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function PlaybooksPanel({
  playbooks,
  onLaunch,
  busy,
}: {
  playbooks: ProductPlaybookDto[];
  onLaunch: (id: string) => void;
  busy: string | null;
}) {
  const { t } = useTranslation();
  return (
    <Panel className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">{t("productDesk.playbooks.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("productDesk.playbooks.subtitle")}</p>
      </div>
      {playbooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("productDesk.playbooks.empty")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {playbooks.map((pb) => (
            <div key={pb.id} className="rounded-lg border border-border/60 p-4 space-y-2">
              <h3 className="font-medium text-sm">{pb.label}</h3>
              <p className="text-xs text-muted-foreground">{pb.description}</p>
              <Button size="sm" disabled={busy === pb.id} onClick={() => onLaunch(pb.id)}>
                <Play className="h-3.5 w-3.5 mr-1" />
                {t("productDesk.playbooks.launch")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function ProductDeskPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<TenantProduct | null>(null);
  const [board, setBoard] = useState<ProductDeskBoard | null>(null);
  const [roadmap, setRoadmap] = useState<ProductRoadmapBoard | null>(null);
  const [signals, setSignals] = useState<ProductSignalDto[]>([]);
  const [signalSummary, setSignalSummary] = useState<ProductSignalSummary | null>(null);
  const [playbooks, setPlaybooks] = useState<ProductPlaybookDto[]>([]);
  const [tab, setTab] = useState<DeskTab>("desk");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [syncingForge, setSyncingForge] = useState(false);
  const [refreshingRecs, setRefreshingRecs] = useState(false);

  const reloadDesk = useCallback(async () => {
    if (!productId) return;
    const desk = await api.products.desk(productId);
    setBoard(desk.board);
  }, [productId]);

  const reloadAll = useCallback(async () => {
    if (!productId) return;
    const [list, desk, roadmapRes, signalsRes, playbooksRes] = await Promise.all([
      api.products.list(),
      api.products.desk(productId),
      api.products.roadmap(productId),
      api.products.signals(productId),
      api.products.playbooks(productId),
    ]);
    const p = list.find((row) => row.id === productId) ?? null;
    if (!p) throw new Error("Product not found");
    setProduct(p);
    setBoard(desk.board);
    setRoadmap(roadmapRes.board);
    setSignals(signalsRes.signals);
    setSignalSummary(signalsRes.summary);
    setPlaybooks(playbooksRes.playbooks);
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    reloadAll()
      .catch((err) => toast.error(translateApiError(err, t, "common.requestFailed")))
      .finally(() => setLoading(false));
  }, [productId, reloadAll, t]);

  const handleApprove = async (deskItemId: string) => {
    if (!productId) return;
    setBusy(deskItemId);
    try {
      const result = await api.products.approveDeskItem(productId, deskItemId);
      await reloadAll();
      toast.success(t("productDesk.approved"));
      if (result.autoDispatched) {
        toast.success(
          t("productDesk.autoDispatched", { agent: result.autoDispatched.agentName }),
        );
      }
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleArchive = async (deskItemId: string) => {
    if (!productId) return;
    setBusy(deskItemId);
    try {
      await api.products.archiveDeskItem(productId, deskItemId);
      await reloadAll();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleDispatch = async (deskItemId: string, agentId?: string) => {
    if (!productId) return;
    setBusy(deskItemId);
    try {
      const result = await api.products.dispatchDeskItem(productId, deskItemId, agentId);
      toast.success(t("productDesk.dispatched", { agent: result.agentName }));
      navigate(`/war-room/${productId}?run=${result.runId}`);
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleLaunchPlaybook = async (playbookId: string) => {
    if (!productId) return;
    setBusy(playbookId);
    try {
      const result = await api.products.launchPlaybook(productId, playbookId);
      toast.success(t("productDesk.playbookLaunched"));
      navigate(`/war-room/${productId}?run=${result.runId}`);
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleMoveKanban = async (deskItemId: string, column: string) => {
    if (!productId) return;
    setBusy(deskItemId);
    try {
      await api.products.updateDeskKanban(productId, deskItemId, column);
      const roadmapRes = await api.products.roadmap(productId);
      setRoadmap(roadmapRes.board);
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleSyncTheForge = async () => {
    if (!productId) return;
    setSyncingForge(true);
    try {
      const result = await api.products.syncTheForge(productId);
      if (result.skipped) {
        toast.message(t("productDesk.theforgeSkipped"));
      } else {
        toast.success(t("productDesk.theforgeSynced", { count: result.created }));
        await reloadAll();
      }
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setSyncingForge(false);
    }
  };

  const handleRefreshRecs = async () => {
    if (!productId) return;
    setRefreshingRecs(true);
    try {
      const result = await api.products.refreshRecommendations(productId);
      toast.success(t("productDesk.recsRefreshed", { count: result.created }));
      await reloadDesk();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setRefreshingRecs(false);
    }
  };

  if (loading || !product || !board || !roadmap || !signalSummary) {
    return <PageLoading message={t("productDesk.loading")} />;
  }

  const tabs: Array<{ id: DeskTab; label: string }> = [
    { id: "desk", label: t("productDesk.tabs.desk") },
    { id: "roadmap", label: t("productDesk.tabs.roadmap") },
    { id: "signals", label: t("productDesk.tabs.signals") },
    { id: "playbooks", label: t("productDesk.tabs.playbooks") },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: t("products.title"), to: "/products" },
          { label: product.name, to: `/war-room/${product.id}` },
          { label: t("productDesk.title") },
        ]}
      />
      <PageHeader
        title={t("productDesk.title")}
        subtitle={t("productDesk.subtitle", { name: product.name })}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" disabled={refreshingRecs} onClick={handleRefreshRecs}>
              <Sparkles className={`h-4 w-4 mr-1 ${refreshingRecs ? "animate-pulse" : ""}`} />
              {t("productDesk.refreshRecs")}
            </Button>
            <Button variant="ghost" size="sm" disabled={syncingForge} onClick={handleSyncTheForge}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncingForge ? "animate-spin" : ""}`} />
              {t("productDesk.syncTheforge")}
            </Button>
            <Link
              to={`/war-room/${product.id}`}
              className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/40"
            >
              {t("products.active.warRoom")}
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab === entry.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "desk" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <DeskZone
            title={t("productDesk.zones.forYou")}
            empty={t("productDesk.zones.forYouEmpty")}
            items={board.forYou}
            zone="forYou"
            onApprove={handleApprove}
            onArchive={handleArchive}
            onRunPlaybook={handleLaunchPlaybook}
            busy={busy}
          />
          <DeskZone
            title={t("productDesk.zones.ready")}
            empty={t("productDesk.zones.readyEmpty")}
            items={board.ready}
            zone="ready"
            onDispatch={handleDispatch}
            busy={busy}
          />
          <DeskZone
            title={t("productDesk.zones.inProgress")}
            empty={t("productDesk.zones.inProgressEmpty")}
            items={board.inProgress}
            zone="inProgress"
            busy={busy}
          />
          <DeskZone
            title={t("productDesk.zones.recent")}
            empty={t("productDesk.zones.recentEmpty")}
            items={board.recent}
            zone="recent"
            busy={busy}
          />
        </div>
      ) : null}

      {tab === "roadmap" ? (
        <div className="grid gap-4 lg:grid-cols-4">
          <RoadmapColumn
            title={t("productDesk.roadmap.backlog")}
            empty={t("productDesk.roadmap.empty")}
            items={roadmap.backlog}
            columnKey="backlog"
            onMove={handleMoveKanban}
            busy={busy}
          />
          <RoadmapColumn
            title={t("productDesk.roadmap.approved")}
            empty={t("productDesk.roadmap.empty")}
            items={roadmap.approved}
            columnKey="approved"
            onMove={handleMoveKanban}
            busy={busy}
          />
          <RoadmapColumn
            title={t("productDesk.roadmap.inProgress")}
            empty={t("productDesk.roadmap.empty")}
            items={roadmap.inProgress}
            columnKey="inProgress"
            onMove={handleMoveKanban}
            busy={busy}
          />
          <RoadmapColumn
            title={t("productDesk.roadmap.done")}
            empty={t("productDesk.roadmap.empty")}
            items={roadmap.done}
            columnKey="done"
            onMove={handleMoveKanban}
            busy={busy}
          />
        </div>
      ) : null}

      {tab === "signals" ? (
        <SignalsPanel summary={signalSummary} signals={signals} />
      ) : null}

      {tab === "playbooks" ? (
        <PlaybooksPanel playbooks={playbooks} onLaunch={handleLaunchPlaybook} busy={busy} />
      ) : null}
    </div>
  );
}
