import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  api,
  type OfficeArchiveItem,
  type ProductConsensusRevision,
  type TenantConsensus,
  type TenantProduct,
} from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import { toast } from "../components/molecules/Sonner";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import MarkdownPreview from "../components/ui/MarkdownPreview";
import EmptyState from "../components/ui/EmptyState";
import Select from "../components/ui/Select";
import StatusPill from "../components/ui/StatusPill";
import ProductConsensusPage from "./ProductConsensusPage";

type MemoriaTab = "empresa" | "producto" | "historial";

function parseTab(value: string | null): MemoriaTab {
  if (value === "producto" || value === "historial") return value;
  return "empresa";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function CompanyMemoryEditor() {
  const { t } = useTranslation();
  const [record, setRecord] = useState<TenantConsensus | null>(null);
  const [content, setContent] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    api.consensus
      .get()
      .then((consensus) => {
        setRecord(consensus);
        setContent(consensus.content);
        setNextAction(consensus.nextAction ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => {
    if (!record) return false;
    return content !== record.content || (nextAction || null) !== (record.nextAction ?? null);
  }, [content, nextAction, record]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.consensus.update({ content, nextAction: nextAction || undefined });
      setRecord(updated);
      toast.success(t("consensus.saveConsensus"));
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setSaving(false);
    }
  };

  const clearConsensus = async () => {
    if (!window.confirm(t("consensus.clearConsensusConfirmCompany"))) return;
    setClearing(true);
    try {
      const updated = await api.consensus.clear();
      setRecord(updated);
      setContent(updated.content);
      setNextAction(updated.nextAction ?? "");
      toast.success(t("consensus.clearConsensusDone"));
    } catch (err) {
      toast.error(translateApiError(err, t, "consensus.clearConsensusFailed"));
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <PageLoading message={t("consensus.loading")} />;

  return (
    <Panel
      title={t("office.memoria.tabs.empresa")}
      subtitle={t("consensus.companyHelp", { defaultValue: "Company-level memory: phase, pipeline and next action." })}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" size="sm" onClick={() => void clearConsensus()} disabled={clearing || saving}>
            {clearing ? t("common.loading") : t("consensus.clearConsensus")}
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving || !dirty || clearing}>
            {saving ? t("common.saving") : t("consensus.saveConsensus")}
          </Button>
        </div>
      }
      hover
    >
      <div className="space-y-4">
        <Input
          label={t("consensus.nextAction")}
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder={t("consensus.nextActionPlaceholder")}
        />
        <MarkdownPreview value={content} onChange={setContent} rows={16} ariaLabel={t("consensus.document")} />
      </div>
    </Panel>
  );
}

function MemoriaHistorialPanel({ productId }: { productId: string }) {
  const { t } = useTranslation();
  const [archiveItems, setArchiveItems] = useState<OfficeArchiveItem[]>([]);
  const [revisions, setRevisions] = useState<ProductConsensusRevision[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [archive, revs] = await Promise.all([
      api.office.archive({ productId, limit: 40 }),
      api.products.consensus.revisions(productId, 30).catch(() => []),
    ]);
    setArchiveItems(archive.items);
    setRevisions(revs);
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => {
        setArchiveItems([]);
        setRevisions([]);
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) return <PageLoading message={t("office.memoria.loading")} />;

  return (
    <div className="space-y-6">
      <Panel title={t("office.memoria.historial.revisions")} hover data-testid="memoria-revisions-panel">
        {revisions.length === 0 ? (
          <EmptyState title={t("consensus.noRevisionsTitle")} description={t("consensus.noRevisions")} />
        ) : (
          <ol className="space-y-3">
            {revisions.map((rev) => (
              <li
                key={rev.id}
                data-testid="revision-item"
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <StatusPill status="running">#{rev.stepOrder}</StatusPill>
                  <span className="font-medium">{rev.agentName}</span>
                  <span className="text-muted-foreground">{formatTime(rev.createdAt)}</span>
                </div>
                {rev.nextAction ? (
                  <p className="text-xs">
                    <span className="font-medium">{t("consensus.nextAction")}:</span> {rev.nextAction}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel title={t("office.memoria.historial.documents")} hover>
        {archiveItems.length === 0 ? (
          <EmptyState
            title={t("office.archive.emptyTitle", { defaultValue: "No documents" })}
            description={t("office.archive.emptyDescription", { defaultValue: "Complete an encargo to see deliverables here." })}
          />
        ) : (
          <ul className="space-y-2">
            {archiveItems.slice(0, 20).map((item) => (
              <li key={item.id}>
                <Link
                  to={`/office/archive?productId=${encodeURIComponent(productId)}`}
                  className="block rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:border-[var(--color-primary)]/40"
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{item.source}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to={`/office/archive?productId=${encodeURIComponent(productId)}`} className="office-roi-link mt-3 inline-block">
          {t("office.recentArchive.viewAll")} →
        </Link>
      </Panel>
    </div>
  );
}

export default function OfficeMemoriaPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const productId = searchParams.get("productId")?.trim() ?? "";
  const [products, setProducts] = useState<TenantProduct[]>([]);

  useEffect(() => {
    api.products.list().then(setProducts).catch(() => setProducts([]));
  }, []);

  const setTab = (next: MemoriaTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    if (next !== "producto" && next !== "historial") {
      params.delete("productId");
    }
    setSearchParams(params, { replace: true });
  };

  const setProduct = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab === "empresa" ? "producto" : tab);
    if (id) params.set("productId", id);
    else params.delete("productId");
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="office-memoria-page mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("office.encargos.breadcrumbOffice"), to: "/office" },
              { label: t("office.memoria.title") },
            ]}
          />
        }
        title={t("office.memoria.title")}
        subtitle={t("office.memoria.subtitle")}
      />

      <div
        className="office-trabajo-tabs office-memoria-tabs flex flex-wrap gap-1 border-b border-[var(--color-border)]"
        role="tablist"
        aria-label={t("office.memoria.tabsLabel")}
      >
        {(["empresa", "producto", "historial"] as MemoriaTab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            data-testid={`memoria-tab-${key}`}
            onClick={() => setTab(key)}
            className={`interactive rounded-t-md px-3 py-2 text-sm font-medium transition ${
              tab === key
                ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-b-2 border-transparent text-muted-foreground hover:text-[var(--color-foreground)]"
            }`}
          >
            {t(`office.memoria.tabs.${key}`)}
          </button>
        ))}
      </div>

      {(tab === "producto" || tab === "historial") && (
        <Panel title={t("office.memoria.productScope")} bodySize="sm">
          <Select
            ariaLabel={t("office.memoria.productScope")}
            value={productId}
            onChange={setProduct}
            options={[
              { value: "", label: t("office.memoria.selectProduct") },
              ...products.map((p) => ({ value: p.id, label: p.name })),
            ]}
            className="!max-w-md"
            size="sm"
          />
        </Panel>
      )}

      {tab === "empresa" ? <CompanyMemoryEditor /> : null}

      {tab === "producto" && productId ? (
        <div className="office-memoria-product-embed">
          <ProductConsensusPage officeMode productIdOverride={productId} />
        </div>
      ) : null}

      {tab === "producto" && !productId ? (
        <EmptyState
          title={t("office.memoria.selectProductTitle")}
          description={t("office.memoria.selectProductDescription")}
        />
      ) : null}

      {tab === "historial" && productId ? <MemoriaHistorialPanel productId={productId} /> : null}

      {tab === "historial" && !productId ? (
        <Panel title={t("office.memoria.historial.company")} hover>
          <p className="mb-3 text-sm text-muted-foreground">{t("office.memoria.historial.companyHint")}</p>
          <Link to="/office/archive" className="office-link-btn">
            {t("office.recentArchive.viewAll")}
          </Link>
        </Panel>
      ) : null}
    </div>
  );
}
