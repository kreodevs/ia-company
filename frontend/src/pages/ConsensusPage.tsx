import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type TenantConsensus } from "../lib/api";

export default function ConsensusPage() {
  const { t } = useTranslation();
  const [record, setRecord] = useState<TenantConsensus | null>(null);
  const [content, setContent] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.consensus
      .get()
      .then((data) => {
        setRecord(data);
        setContent(data.content);
        setNextAction(data.nextAction ?? "");
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

  if (loading) return <p className="text-[var(--color-muted-foreground)]">{t("consensus.loading")}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("consensus.title")}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t("consensus.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {record?.companyPhase && (
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1 text-xs capitalize">
            {t("phase.label", {
              phase: t(`phase.${record.companyPhase}`, { defaultValue: record.companyPhase }),
            })}
          </span>
        )}
        <Link to="/ops" className="text-sm text-[var(--color-primary)] hover:underline">
          {t("consensus.viewOpsDashboard")}
        </Link>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("consensus.nextAction")}</span>
        <input
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder={t("consensus.nextActionPlaceholder")}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("consensus.document")}</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 font-mono text-xs"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {saving ? t("common.saving") : t("consensus.saveConsensus")}
        </button>
        {record?.updatedAt && (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {t("consensus.lastUpdated", { date: new Date(record.updatedAt).toLocaleString() })}
          </span>
        )}
      </div>
    </div>
  );
}
