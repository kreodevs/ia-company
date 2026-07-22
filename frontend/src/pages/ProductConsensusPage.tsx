import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type ProductConsensus, type ProductConsensusRevision, type TenantProduct } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import ProductActionsMenu from "../components/ui/ProductActionsMenu";
import MarkdownPreview from "../components/ui/MarkdownPreview";
import EmptyState from "../components/ui/EmptyState";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

type View = "document" | "revisions";

export default function ProductConsensusPage() {
  const { t } = useTranslation();
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  const [record, setRecord] = useState<ProductConsensus | null>(null);
  const [revisions, setRevisions] = useState<ProductConsensusRevision[]>([]);
  const [product, setProduct] = useState<TenantProduct | null>(null);
  const [content, setContent] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View>("document");

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    Promise.all([
      api.products.consensus.get(productId),
      api.products.consensus.revisions(productId, 50),
      api.products.list(),
    ])
      .then(([consensus, revs, list]) => {
        setRecord(consensus);
        setContent(consensus.content);
        setNextAction(consensus.nextAction ?? "");
        setRevisions(revs);
        setProduct(list.find((p) => p.id === productId) ?? null);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const save = async () => {
    if (!productId) return;
    setSaving(true);
    try {
      const updated = await api.products.consensus.update(productId, {
        content,
        nextAction: nextAction || undefined,
      });
      setRecord(updated);
    } finally {
      setSaving(false);
    }
  };

  const dirty = useMemo(() => {
    if (!record) return false;
    return content !== record.content || (nextAction || null) !== (record.nextAction ?? null);
  }, [content, nextAction, record]);

  if (loading) return <PageLoading message={t("consensus.loading")} />;
  if (!productId) return <div>Missing product id</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("nav.consensus"), to: "/consensus" },
              { label: t("consensus.productTab", { defaultValue: "Product memory" }) },
            ]}
          />
        }
        title={t("consensus.productTitle", { name: record?.productId ?? productId })}
        subtitle={t("consensus.productSubtitle")}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge>{t("consensus.cycleNumber", { n: record?.cycleNumber ?? 0 })}</Badge>
            {product && <ProductActionsMenu product={product} onChange={() => {
              api.products.list().then((list) => {
                setProduct(list.find((p) => p.id === productId) ?? null);
              });
            }} />}
            {record?.updatedAt && (
              <span className="text-[var(--color-muted-foreground)]">
                {t("consensus.lastUpdated", { date: formatTime(record.updatedAt) })}
              </span>
            )}
            <Link
              to={`/products/${productId}/team`}
              className="rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-3 py-1 font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
            >
              {t("warRoom.title", { name: record?.productId ?? productId })}
            </Link>
            <Link
              to={`/products/${productId}/code`}
              className="text-[var(--color-primary)] hover:underline"
            >
              {t("consensus.viewCode")}
            </Link>
          </div>
        }
      />

      <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
        <button
          type="button"
          role="tab"
          aria-selected={view === "document"}
          onClick={() => setView("document")}
          className={`interactive rounded-t-md px-3 py-2 text-sm font-medium transition ${
            view === "document"
              ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-b-2 border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          }`}
        >
          {t("consensus.productTab", { defaultValue: "Document" })}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "revisions"}
          onClick={() => setView("revisions")}
          className={`interactive inline-flex items-center gap-2 rounded-t-md px-3 py-2 text-sm font-medium transition ${
            view === "revisions"
              ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-b-2 border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          }`}
        >
          {t("consensus.revisionsTitle")}
          {revisions.length > 0 && (
            <span className="rounded-full bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-semibold">
              {revisions.length}
            </span>
          )}
        </button>
      </div>

      {view === "document" && (
        <Card className="space-y-4">
          <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-muted-foreground)]">
            {t("consensus.productHelp", { defaultValue: "This is the product-scoped memory. Edits replace the document; per-step agent handoffs are recorded in the Revisions tab." })}
          </p>
          <Input
            label={t("consensus.nextAction")}
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder={t("consensus.nextActionPlaceholder")}
          />
          <MarkdownPreview
            value={content}
            onChange={setContent}
            rows={18}
            ariaLabel={t("consensus.document")}
            placeholder={t("consensus.nextActionPlaceholder")}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button disabled={saving || !dirty} onClick={() => void save()} fullWidthMobile>
              {saving ? t("common.saving") : t("consensus.saveConsensus")}
            </Button>
            {!dirty && record && (
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {t("consensus.noChangesToSave", { defaultValue: "No changes to save." })}
              </span>
            )}
          </div>
        </Card>
      )}

      {view === "revisions" && (
        <Card className="space-y-4">
          {revisions.length === 0 ? (
            <EmptyState
              title={t("consensus.noRevisionsTitle", { defaultValue: "No revisions yet" })}
              description={t("consensus.noRevisions")}
            />
          ) : (
            <ol className="space-y-3">
              {revisions.map((rev) => (
                <li
                  key={rev.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge>#{rev.stepOrder}</Badge>
                    <span className="font-medium">{rev.agentName}</span>
                    <span className="text-[var(--color-muted-foreground)]">
                      {formatTime(rev.createdAt)}
                    </span>
                    {rev.runId && (
                      <Link
                        to={`/runs/${rev.runId}`}
                        className="text-[var(--color-muted-foreground)] hover:underline"
                      >
                        run:{rev.runId.slice(0, 8)}
                      </Link>
                    )}
                  </div>
                  {rev.veto && (
                    <div className="mb-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">
                      <strong>{t("consensus.veto", { defaultValue: "VETO" })}</strong> by {rev.veto.by}: {rev.veto.reason}
                    </div>
                  )}
                  {rev.decisions.length > 0 && (
                    <ul className="mb-2 list-disc space-y-1 pl-5 text-xs">
                      {rev.decisions.map((d, i) => (
                        <li key={i}>
                          <strong>{d.by}</strong>: {d.what}
                          {d.why ? <em className="text-[var(--color-muted-foreground)]"> — {d.why}</em> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {rev.openQuestions.length > 0 && (
                    <div className="mb-2 text-xs">
                      <span className="font-medium">{t("consensus.openQuestions", { defaultValue: "Open questions:" })}</span>
                      <ul className="ml-4 list-disc">
                        {rev.openQuestions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {rev.nextAction && (
                    <div className="mb-2 text-xs">
                      <span className="font-medium">{t("consensus.nextAction")}:</span> {rev.nextAction}
                    </div>
                  )}
                  <details className="rounded bg-[var(--color-surface)] p-2 text-xs">
                    <summary className="cursor-pointer text-[var(--color-muted-foreground)]">
                      {t("consensus.viewRawContent", { defaultValue: "View raw revision content" })}
                    </summary>
                    <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-snug text-[var(--color-muted-foreground)]">
                      {rev.content}
                    </pre>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </div>
  );
}