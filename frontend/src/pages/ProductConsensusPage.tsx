import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type ProductConsensus, type ProductConsensusRevision } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function ProductConsensusPage() {
  const { t } = useTranslation();
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  const [record, setRecord] = useState<ProductConsensus | null>(null);
  const [revisions, setRevisions] = useState<ProductConsensusRevision[]>([]);
  const [content, setContent] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    Promise.all([api.products.consensus.get(productId), api.products.consensus.revisions(productId, 50)])
      .then(([consensus, revs]) => {
        setRecord(consensus);
        setContent(consensus.content);
        setNextAction(consensus.nextAction ?? "");
        setRevisions(revs);
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

  if (loading) return <PageLoading message={t("consensus.loading")} />;
  if (!productId) return <div>Missing product id</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t("consensus.productTitle", { name: record?.productId ?? productId })}
        subtitle={t("consensus.productSubtitle")}
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge>
          {t("consensus.cycleNumber", { n: record?.cycleNumber ?? 0 })}
        </Badge>
        {record?.updatedAt && (
          <span className="text-[var(--color-muted-foreground)]">
            {t("consensus.lastUpdated", { date: formatTime(record.updatedAt) })}
          </span>
        )}
        <Link to="/consensus" className="interactive text-[var(--color-primary)] hover:underline">
          {t("consensus.backToCompany")}
        </Link>
      </div>

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
            rows={18}
            className="interactive w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 font-mono text-xs sm:py-2"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button disabled={saving} onClick={() => void save()} fullWidthMobile>
            {saving ? t("common.saving") : t("consensus.saveConsensus")}
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold">{t("consensus.revisionsTitle")}</h2>
        {revisions.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t("consensus.noRevisions")}
          </p>
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
                    <span className="text-[var(--color-muted-foreground)]">
                      run:{rev.runId.slice(0, 8)}
                    </span>
                  )}
                </div>
                {rev.veto && (
                  <div className="mb-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">
                    <strong>VETO</strong> by {rev.veto.by}: {rev.veto.reason}
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
                    <span className="font-medium">Open questions:</span>
                    <ul className="ml-4 list-disc">
                      {rev.openQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {rev.nextAction && (
                  <div className="mb-2 text-xs">
                    <span className="font-medium">Next action:</span> {rev.nextAction}
                  </div>
                )}
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-[var(--color-surface)] p-2 font-mono text-[11px] leading-snug text-[var(--color-muted-foreground)]">
                  {rev.content}
                </pre>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
