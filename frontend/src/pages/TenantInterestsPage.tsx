import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type TenantInterests } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function TenantInterestsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<TenantInterests | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.tenantSettings
      .getInterests()
      .then((d) => {
        setData(d);
        setSelected(new Set(d.selected));
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.tenantSettings.updateInterests({ categories: Array.from(selected) });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) return <PageLoading message={t("common.loading")} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t("interests.title")}
        subtitle={t("interests.subtitle")}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {data.categories.map((cat) => {
          const isSelected = selected.has(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggle(cat.id)}
              className={`interactive group rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]/40"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/60"
              }`}
              data-testid={`interest-${cat.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden="true">
                  {cat.emoji}
                </span>
                {isSelected && (
                  <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-primary-foreground)]">
                    {t("interests.selected")}
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-sm font-semibold">{cat.label}</h3>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {cat.description}
              </p>
            </button>
          );
        })}
      </div>

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("interests.countLabel", { count: selected.size })}
        </p>
        <Button
          disabled={!dirty || saving}
          onClick={() => void save()}
          fullWidthMobile
        >
          {saving ? t("common.saving") : t("interests.save")}
        </Button>
      </Card>
    </div>
  );
}