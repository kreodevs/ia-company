import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Focus, PlayCircle, Plus, Settings2, Target } from "lucide-react";
import { api, type OpencodeActiveInfo, type PipelineIdea, type ProductsOverview, type TenantProduct } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import { toast } from "../components/molecules/Sonner";
import ProductActionsMenu from "../components/ui/ProductActionsMenu";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Button from "../components/ui/Button";
import Panel from "../components/ui/Panel";
import StatusPill from "../components/ui/StatusPill";
import EmptyState from "../components/ui/EmptyState";
import TabsBar from "../components/ui/TabsBar";
import AddProductDialog from "../components/products/AddProductDialog";
import VerticalPacksPanel from "../components/products/VerticalPacksPanel";

type ProductsTab = "opportunities" | "active";

function productPhaseLabel(
  phase: TenantProduct["phase"],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  return t(`products.active.phase.${phase}`, { defaultValue: phase });
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = useState<ProductsOverview | null>(null);
  const [orgUnitNames, setOrgUnitNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [evaluatingIdeaId, setEvaluatingIdeaId] = useState<string | null>(null);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const activeTab: ProductsTab =
    searchParams.get("tab") === "active" ? "active" : "opportunities";

  const load = async () => {
    setLoading(true);
    try {
      const [nextOverview, units] = await Promise.all([
        api.products.overview(),
        api.orgUnits.list().catch(() => []),
      ]);
      setOverview(nextOverview);
      setOrgUnitNames(Object.fromEntries(units.map((u) => [u.id, u.name])));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setTab = (tab: ProductsTab) => {
    setSearchParams(tab === "opportunities" ? {} : { tab });
  };

  const evaluateIdea = async (ideaId: string) => {
    setEvaluatingIdeaId(ideaId);
    try {
      const { runId } = await api.products.evaluateIdea(ideaId);
      toast.success(t("products.toast.evaluateStarted"));
      await load();
      navigate(`/runs/${runId}`);
    } catch (err) {
      toast.error(translateApiError(err, t, "products.toast.evaluateFailed"));
    } finally {
      setEvaluatingIdeaId(null);
    }
  };

  const rejectIdea = async (ideaId: string) => {
    try {
      await api.products.pipelineDecision(ideaId, "no_go");
      toast.success(t("products.toast.noGoDone"));
      await load();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    }
  };

  const deleteIdea = async (ideaId: string) => {
    try {
      await api.products.deletePipelineIdea(ideaId);
      toast.success(t("products.toast.ideaDeleted"));
      await load();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.deleteFailed"));
    }
  };

  const cancelProduct = async (productId: string) => {
    try {
      await api.products.cancel(productId);
      toast.success(t("products.toast.productCancelled"));
      await load();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await api.products.delete(productId);
      toast.success(t("products.toast.productDeleted"));
      await load();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.deleteFailed"));
    }
  };

  const focusProduct = async (product: TenantProduct) => {
    try {
      await api.products.focus(product.id);
      toast.success(t("products.toast.focusSet", { name: product.name }));
      await load();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    }
  };

  if (loading) {
    return <PageLoading message={t("products.loading")} />;
  }

  if (!overview) {
    return <p className="text-[var(--color-muted-foreground)]">{t("products.loadFailed")}</p>;
  }

  const pendingOpportunities = overview.pipeline.filter((idea) => idea.goNoGo === "pending");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("products.title")}
        subtitle={t("products.subtitle")}
        actions={
          <Button onClick={() => setAddProductOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            {t("products.active.addProduct")}
          </Button>
        }
      />

      <AddProductDialog
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onCreated={(product, mode, meta) => {
          toast.success(
            t(mode === "bootstrap" ? "products.toast.productBootstrapped" : "products.toast.productRegistered"),
          );
          void load().then(() => {
            setTab("active");
            const runQuery = meta?.intakeRunId ? `?run=${meta.intakeRunId}` : "";
            navigate(`/war-room/${product.id}${runQuery}`);
          });
        }}
      />

      <VerticalPacksPanel onApplied={() => void load()} />

      <TabsBar
        activeId={activeTab}
        onChange={(id) => setTab(id as ProductsTab)}
        tabs={[
          {
            id: "opportunities",
            label: t("products.tabs.opportunities"),
            badge:
              overview.pipeline.length > 0 ? (
                <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] font-semibold">
                  {overview.pipeline.length}
                </span>
              ) : null,
          },
          {
            id: "active",
            label: t("products.tabs.active"),
            badge:
              overview.products.length > 0 ? (
                <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] font-semibold">
                  {overview.products.length}
                </span>
              ) : null,
          },
        ]}
      />

      {activeTab === "opportunities" ? (
        <Panel
          title={t("products.opportunities.title")}
          subtitle={t("products.opportunities.subtitle")}
          actions={
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {t("products.opportunities.count", { count: pendingOpportunities.length })}
            </span>
          }
          bodySize="sm"
        >
          {overview.pipeline.length === 0 ? (
            <EmptyState
              title={t("products.opportunities.emptyTitle")}
              description={t("products.opportunities.emptyHint")}
              action={
                overview.lastDiscoveryRun ? (
                  <Link to={`/runs/${overview.lastDiscoveryRun.id}`}>
                    <Button variant="ghost">{t("products.opportunities.viewLastDiscovery")}</Button>
                  </Link>
                ) : (
                  <Link to="/ops">
                    <Button variant="secondary">{t("nav.ops")}</Button>
                  </Link>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {overview.pipeline.map((idea) => (
                <OpportunityRow
                  key={idea.id}
                  idea={idea}
                  isEvaluating={evaluatingIdeaId === idea.id}
                  onEvaluate={() => void evaluateIdea(idea.id)}
                  onReject={() => void rejectIdea(idea.id)}
                  onDelete={() => void deleteIdea(idea.id)}
                  t={t}
                />
              ))}
            </ul>
          )}
        </Panel>
      ) : (
        <Panel
          title={t("products.active.title")}
          subtitle={t("products.active.subtitle")}
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {t("products.active.count", { count: overview.products.length })}
              </span>
              <Button variant="secondary" size="sm" onClick={() => setAddProductOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                {t("products.active.addProduct")}
              </Button>
            </div>
          }
          bodySize="sm"
        >
          {overview.products.length === 0 ? (
            <EmptyState
              title={t("products.active.emptyTitle")}
              description={t("products.active.emptyHint")}
              action={
                <Button onClick={() => setAddProductOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                  {t("products.active.addProduct")}
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {overview.products.map((product) => (
                <ActiveProductCard
                  key={product.id}
                  product={product}
                  orgUnitName={product.orgUnitId ? orgUnitNames[product.orgUnitId] : undefined}
                  isFocused={overview.focusProduct?.id === product.id}
                  opencodeActive={overview.opencodeActiveByProductId?.[product.id] ?? null}
                  onFocus={() => void focusProduct(product)}
                  onCancel={() => cancelProduct(product.id)}
                  onDelete={() => deleteProduct(product.id)}
                  onChange={() => void load()}
                  t={t}
                />
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}

function OpportunityRow({
  idea,
  isEvaluating,
  onEvaluate,
  onReject,
  onDelete,
  t,
}: {
  idea: PipelineIdea;
  isEvaluating: boolean;
  onEvaluate: () => void;
  onReject: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleReject = async () => {
    setBusy(true);
    try {
      await onReject();
      setConfirmReject(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await onDelete();
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{idea.title}</span>
            {idea.goNoGo === "go" && (
              <StatusPill status="completed">{t("products.opportunities.approved")}</StatusPill>
            )}
            {idea.interestScore > 0 && (
              <span className="text-[10px] font-semibold uppercase text-[var(--color-muted-foreground)]">
                {t("products.opportunities.score", { score: idea.interestScore.toFixed(1) })}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            {idea.description || t("products.opportunities.noDescription")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button disabled={isEvaluating} onClick={onEvaluate} size="sm">
            {isEvaluating ? t("products.opportunities.evaluating") : t("products.opportunities.evaluate")}
          </Button>
          {idea.goNoGo !== "no_go" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--color-destructive)]"
                onClick={() => setConfirmReject(true)}
              >
                {t("products.opportunities.discard")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--color-destructive)]"
                onClick={() => setConfirmDelete(true)}
              >
                {t("products.opportunities.delete")}
              </Button>
            </>
          )}
        </div>
      </div>
      {idea.goNoGo === "pending" && (
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{t("products.opportunities.noGoHint")}</p>
      )}

      <ConfirmDialog
        open={confirmReject}
        title={t("products.opportunities.discardTitle", { name: idea.title })}
        description={t("products.opportunities.discardDescription")}
        confirmLabel={t("products.opportunities.discard")}
        destructive
        busy={busy}
        onCancel={() => (busy ? undefined : setConfirmReject(false))}
        onConfirm={() => void handleReject()}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t("products.opportunities.deleteTitle", { name: idea.title })}
        description={t("products.opportunities.deleteDescription")}
        confirmLabel={t("products.opportunities.delete")}
        destructive
        busy={busy}
        onCancel={() => (busy ? undefined : setConfirmDelete(false))}
        onConfirm={() => void handleDelete()}
      />
    </li>
  );
}

function ActiveProductCard({
  product,
  orgUnitName,
  isFocused,
  opencodeActive,
  onFocus,
  onCancel,
  onDelete,
  onChange,
  t,
}: {
  product: TenantProduct;
  orgUnitName?: string;
  isFocused: boolean;
  opencodeActive: OpencodeActiveInfo | null;
  onFocus: () => void;
  onCancel: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onChange: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const isArchived = product.phase === "archived";

  const runCancel = async () => {
    setBusy(true);
    try {
      await onCancel();
      setConfirmCancel(false);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    setBusy(true);
    try {
      await onDelete();
      setConfirmDelete(false);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li>
      <div
        className={`rounded-xl border p-4 transition ${
          isFocused
            ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5"
            : "border-[var(--color-border)] bg-[var(--color-background)]"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">{product.name}</span>
              {isFocused && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  <Focus className="h-3 w-3" aria-hidden />
                  {t("products.active.focused")}
                </span>
              )}
              <StatusPill status={product.phase} />
              {orgUnitName && product.orgUnitId && (
                <Link
                  to={`/org-units/${product.orgUnitId}`}
                  className="inline-flex items-center rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
                >
                  {t("products.active.orgUnitBadge", { name: orgUnitName })}
                </Link>
              )}
              {product.workItemKind && product.workItemKind !== "product" && (
                <span className="text-[10px] font-semibold uppercase text-[var(--color-muted-foreground)]">
                  {t(`products.settings.workItemKind.${product.workItemKind}`)}
                </span>
              )}
              {opencodeActive && (
                <Link
                  to={`/runs/${opencodeActive.runId}`}
                  className="inline-flex items-center rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]"
                >
                  {t("opencode.activeBadge")}
                </Link>
              )}
              {product.goNoGo === "no_go" && (
                <span className="text-[10px] font-semibold uppercase text-[var(--color-destructive)]">
                  {t("products.active.noGo")}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {product.description || t("products.active.noDescription")}
            </p>
            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
              <div>
                <dt className="inline font-medium">{t("products.active.status")}: </dt>
                <dd className="inline">{productPhaseLabel(product.phase, t)}</dd>
              </div>
              <div>
                <dt className="inline font-medium">{t("products.active.workspace")}: </dt>
                <dd className="inline">
                  <code>projects/{product.slug}/</code>
                </dd>
              </div>
            </dl>
          </div>
          <ProductActionsMenu product={product} onChange={onChange} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
          <Link
            to={`/war-room/${product.id}`}
            className="interactive inline-flex items-center gap-1.5 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
          >
            <Target className="h-3.5 w-3.5" aria-hidden />
            {t("products.active.warRoom")}
          </Link>
          <Link
            to={`/products/${product.id}/settings`}
            className="interactive inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs hover:border-[var(--color-primary)]/40"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            {t("products.active.settings")}
          </Link>
          <Link
            to={`/products/${product.id}/code`}
            className="interactive inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs hover:border-[var(--color-primary)]/40"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {t("products.active.code")}
          </Link>
          {product.lastRunId ? (
            <Link
              to={`/office/encargos/${product.lastRunId}`}
              className="interactive inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs hover:border-[var(--color-primary)]/40"
            >
              <PlayCircle className="h-3.5 w-3.5" aria-hidden />
              {t("products.active.reports")}
            </Link>
          ) : null}
          {!isFocused && product.phase !== "archived" && (
            <button
              type="button"
              onClick={onFocus}
              className="interactive ml-auto rounded-md px-2 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
              title={t("products.active.focusHint")}
            >
              {t("products.active.focus")}
            </button>
          )}
          {!isArchived && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--color-destructive)]"
                onClick={() => setConfirmCancel(true)}
              >
                {t("products.active.cancel")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--color-destructive)]"
                onClick={() => setConfirmDelete(true)}
              >
                {t("products.active.delete")}
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={t("products.active.cancelTitle", { name: product.name })}
        description={t("products.active.cancelDescription")}
        confirmLabel={t("products.active.cancel")}
        destructive
        busy={busy}
        onCancel={() => (busy ? undefined : setConfirmCancel(false))}
        onConfirm={() => void runCancel()}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t("products.active.deleteTitle", { name: product.name })}
        description={t("products.active.deleteDescription")}
        confirmLabel={t("products.active.delete")}
        destructive
        busy={busy}
        onCancel={() => (busy ? undefined : setConfirmDelete(false))}
        onConfirm={() => void runDelete()}
      />
    </li>
  );
}
