import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type ProductOpencodeSettings } from "../../lib/api";
import Button from "../ui/Button";
import Input from "../ui/Input";

export interface ProductOpencodeSettingsPanelProps {
  productId: string;
}

export default function ProductOpencodeSettingsPanel({ productId }: ProductOpencodeSettingsPanelProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ProductOpencodeSettings | null>(null);
  const [defaultAgent, setDefaultAgent] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    void api.products.opencodeSettings
      .get(productId)
      .then((data) => {
        setSettings(data);
        setDefaultAgent(data.defaultAgent ?? "");
        setDefaultModel(data.defaultModel ?? "");
        setProjectPath(data.projectPath ?? "");
      })
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, [productId]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.products.opencodeSettings.update(productId, {
        defaultAgent: defaultAgent.trim() || null,
        defaultModel: defaultModel.trim() || null,
        projectPath: projectPath.trim() || null,
      });
      setSettings(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm text-[var(--color-muted-foreground)]">
        {t("common.loading")}
      </section>
    );
  }

  if (!settings) return null;

  return (
    <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div>
        <h2 className="text-base font-semibold">{t("opencode.productSettings.title")}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {t("opencode.productSettings.subtitle")}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label={t("opencode.settings.defaultAgent")}
          value={defaultAgent}
          onChange={(e) => setDefaultAgent(e.target.value)}
          disabled={saving}
        />
        <Input
          label={t("opencode.settings.defaultModel")}
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
          disabled={saving}
        />
        <div className="md:col-span-2">
          <Input
            label={t("opencode.settings.projectPath")}
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder={settings.suggestedProjectPath}
            disabled={saving}
          />
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {t("opencode.productSettings.projectPathHint", {
              path: settings.suggestedProjectPath,
            })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? t("common.saving") : t("opencode.productSettings.save")}
        </Button>
        {saved && (
          <span className="text-xs text-[var(--color-accent)]">{t("opencode.productSettings.saved")}</span>
        )}
      </div>
    </section>
  );
}
