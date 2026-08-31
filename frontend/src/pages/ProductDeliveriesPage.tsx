import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Crosshair,
  MessageSquarePlus,
  ScrollText,
  LayoutDashboard,
} from "lucide-react";
import {
  api,
  type ProductDeliveriesAttentionItem,
  type ProductDeliveriesOverview,
} from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import StatusPill from "../components/ui/StatusPill";
import ProductDeliveryEncargoCard from "../components/products/deliveries/ProductDeliveryEncargoCard";

function attentionLabel(
  item: ProductDeliveriesAttentionItem,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  switch (item.kind) {
    case "decision":
      return t("productDeliveries.attention.decision");
    case "failed":
      return t("productDeliveries.attention.failed");
    case "opencode":
      return t("productDeliveries.attention.opencode");
    case "desk":
      return t("productDeliveries.attention.desk");
    default:
      return item.kind;
  }
}

function attentionSubtitle(
  item: ProductDeliveriesAttentionItem,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  if (item.kind === "opencode") {
    if (item.subtitle === "opencode_awaiting") return t("productDeliveries.attention.opencodeAwaiting");
    if (item.subtitle === "opencode_delegated") return t("productDeliveries.attention.opencodeDelegated");
  }
  return item.subtitle;
}

export default function ProductDeliveriesPage() {
  const { productId } = useParams<{ productId: string }>();
  const { t } = useTranslation();
  const [overview, setOverview] = useState<ProductDeliveriesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFailed, setShowFailed] = useState(false);

  const refresh = useCallback(async () => {
    if (!productId) return;
    const data = await api.products.deliveriesOverview(productId);
    setOverview(data);
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    refresh()
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, [productId, refresh]);

  useEffect(() => {
    if (!overview?.inProgress.length) return;
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [overview?.inProgress.length, refresh]);

  if (!productId) {
    return <p className="text-[var(--color-muted-foreground)]">{t("productDeliveries.loadFailed")}</p>;
  }

  if (loading) {
    return <PageLoading message={t("productDeliveries.loading")} />;
  }

  if (!overview) {
    return <p className="text-[var(--color-muted-foreground)]">{t("productDeliveries.loadFailed")}</p>;
  }

  const { product, stats, attention, inProgress, delivered, failed } = overview;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("nav.products"), to: "/products?tab=active" },
              { label: product.name },
              { label: t("productDeliveries.title") },
            ]}
          />
        }
        title={t("productDeliveries.title")}
        subtitle={t("productDeliveries.subtitle", { name: product.name })}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={`/war-room/${productId}`}>
              <Button variant="secondary" size="sm">
                <Crosshair className="mr-1.5 h-4 w-4" aria-hidden />
                {t("productDeliveries.actions.openWarRoom")}
              </Button>
            </Link>
            <Link to={`/office?productId=${productId}`}>
              <Button size="sm">
                <MessageSquarePlus className="mr-1.5 h-4 w-4" aria-hidden />
                {t("productDeliveries.actions.newWork")}
              </Button>
            </Link>
          </div>
        }
        meta={
          <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
            <StatusPill status={product.phase}>{t(`products.active.phase.${product.phase}`, { defaultValue: product.phase })}</StatusPill>
            <span>{t("productDeliveries.stats.total", { count: stats.total })}</span>
            {stats.inProgress > 0 ? (
              <span>{t("productDeliveries.stats.inProgress", { count: stats.inProgress })}</span>
            ) : null}
            {stats.attentionCount > 0 ? (
              <span className="font-medium text-[var(--color-primary)]">
                {t("productDeliveries.stats.attention", { count: stats.attentionCount })}
              </span>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Link
          to={`/products/${productId}/desk`}
          className="interactive inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs hover:border-[var(--color-primary)]/40"
        >
          <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
          {t("productDeliveries.actions.openDesk")}
        </Link>
        <Link
          to={`/debug/products/${productId}/consensus`}
          className="interactive inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs hover:border-[var(--color-primary)]/40"
        >
          <ScrollText className="h-3.5 w-3.5" aria-hidden />
          {t("productDeliveries.actions.openConsensus")}
        </Link>
      </div>

      <Panel title={t("productDeliveries.attention.title")} bodySize="sm">
        {attention.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">{t("productDeliveries.attention.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {attention.map((item, index) => (
              <li
                key={`${item.kind}-${item.runId ?? item.deskItemId ?? index}`}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-[var(--color-primary)]" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                      {attentionLabel(item, t)}
                    </span>
                  </div>
                  <p className="font-medium">{item.title}</p>
                  {attentionSubtitle(item, t) ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">{attentionSubtitle(item, t)}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.kind === "decision" ? (
                    <Link to="/office/pendientes">
                      <Button size="sm">{t("productDeliveries.actions.reviewDecision")}</Button>
                    </Link>
                  ) : null}
                  {item.kind === "desk" ? (
                    <Link to={`/products/${productId}/desk`}>
                      <Button variant="secondary" size="sm">
                        {t("productDeliveries.actions.goToDesk")}
                      </Button>
                    </Link>
                  ) : null}
                  {item.runId ? (
                    <Link
                      to={
                        item.kind === "opencode" || item.kind === "failed"
                          ? `/war-room/${productId}?run=${item.runId}`
                          : `/office/encargos/${item.runId}`
                      }
                    >
                      <Button variant="secondary" size="sm">
                        {item.kind === "opencode"
                          ? t("productDeliveries.inProgress.watchLive")
                          : t("productDeliveries.actions.retryFromEncargo")}
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t("productDeliveries.inProgress.title")} bodySize="sm">
        {inProgress.length === 0 ? (
          <EmptyState title={t("productDeliveries.inProgress.empty")} />
        ) : (
          <ul className="space-y-3">
            {inProgress.map((item) => (
              <ProductDeliveryEncargoCard
                key={item.id}
                item={item}
                productId={productId}
                showWarRoomLink
              />
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title={t("productDeliveries.delivered.title")}
        bodySize="sm"
        actions={
          failed.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setShowFailed((v) => !v)}>
              {showFailed
                ? t("productDeliveries.delivered.hideFailed")
                : t("productDeliveries.delivered.showFailed", { count: failed.length })}
            </Button>
          ) : null
        }
      >
        {delivered.length === 0 && (!showFailed || failed.length === 0) ? (
          <EmptyState title={t("productDeliveries.delivered.empty")} />
        ) : (
          <ul className="space-y-3">
            {delivered.map((item) => (
              <ProductDeliveryEncargoCard key={item.id} item={item} productId={productId} />
            ))}
            {showFailed
              ? failed.map((item) => (
                  <ProductDeliveryEncargoCard key={item.id} item={item} productId={productId} />
                ))
              : null}
          </ul>
        )}
      </Panel>
    </div>
  );
}
