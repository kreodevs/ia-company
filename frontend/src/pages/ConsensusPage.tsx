import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type TenantConsensus, type TenantProduct } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

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

  if (loading) return <PageLoading message={t("consensus.loading")} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("consensus.title")} subtitle={t("consensus.subtitle")} />

      <div className="flex flex-wrap items-center gap-3">
        {record?.companyPhase && (
          <Badge>
            {t("phase.label", {
              phase: t(`phase.${record.companyPhase}`, { defaultValue: record.companyPhase }),
            })}
          </Badge>
        )}
        <Link
          to="/ops"
          className="interactive text-sm text-[var(--color-primary)] hover:underline"
        >
          {t("consensus.viewOpsDashboard")}
        </Link>
      </div>

      {products.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold">{t("consensus.productMemoryHeading")}</h2>
          <ul className="space-y-1 text-sm">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/products/${p.id}/consensus`}
                  className="interactive text-[var(--color-primary)] hover:underline"
                >
                  {p.name} <span className="text-[var(--color-muted-foreground)]">({p.slug})</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-4">
        <Input
          label={t("consensus.nextAction")}
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder={t("consensus.nextActionPlaceholder")}
        />

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">{t("consensus.document")}</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="interactive w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 font-mono text-xs sm:py-2"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button disabled={saving} onClick={() => void save()} fullWidthMobile>
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
