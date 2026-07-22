import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type TenantConsensus, type TenantProduct } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import MarkdownPreview from "../components/ui/MarkdownPreview";

export default function ConsensusPage() {
  const { t } = useTranslation();
  const [record, setRecord] = useState<TenantConsensus | null>(null);
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [content, setContent] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.consensus.get(), api.products.list()])
      .then(([consensus, list]) => {
        setRecord(consensus);
        setContent(consensus.content);
        setNextAction(consensus.nextAction ?? "");
        setProducts(list);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.consensus.update({ content, nextAction: nextAction || undefined });
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("nav.ops"), to: "/ops" },
              { label: t("consensus.title") },
            ]}
          />
        }
        title={t("consensus.title")}
        subtitle={t("consensus.subtitle")}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {record?.companyPhase && (
              <Badge>
                {t("phase.label", {
                  phase: t(`phase.${record.companyPhase}`, { defaultValue: record.companyPhase }),
                })}
              </Badge>
            )}
            <Link to="/ops" className="text-[var(--color-primary)] hover:underline">
              {t("consensus.viewOpsDashboard")}
            </Link>
          </div>
        }
      />

      {products.length > 0 && (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold">{t("consensus.productMemoryHeading")}</h2>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/products/${p.id}/consensus`}
                  className="interactive flex items-center justify-between rounded px-2 py-1 hover:bg-[var(--color-surface)]"
                >
                  <span>
                    {p.name} <span className="text-[var(--color-muted-foreground)]">({p.slug})</span>
                  </span>
                  <Badge>{p.phase}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-4">
        <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-muted-foreground)]">
          {t("consensus.companyHelp", { defaultValue: "Company-level memory: phase, pipeline and next action. Per-product detail lives in each product's memory page." })}
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
          rows={16}
          ariaLabel={t("consensus.document")}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button disabled={saving || !dirty} onClick={() => void save()} fullWidthMobile>
            {saving ? t("common.saving") : t("consensus.saveConsensus")}
          </Button>
          {record?.updatedAt && (
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {t("consensus.lastUpdated", { date: new Date(record.updatedAt).toLocaleString() })}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}