import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type ProductOpencodeSettings } from "../../lib/api";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Panel from "../ui/Panel";

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
      <Panel title={t("opencode.productSettings.title")} subtitle={t("opencode.productSettings.subtitle")}>
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("common.loading")}</p>
      </Panel>
    );
  }

  if (!settings) return null;

  return (
    <Panel title={t("opencode.productSettings.title")} subtitle={t("opencode.productSettings.subtitle")}>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label={t("opencode.settings.defaultAgent")}
            value={defaultAgent}
            onChange={(e) => setDefaultAgent(e.target.value)}
            placeholder={settings.tenantDefaults.defaultAgent ?? t("opencode.productSettings.inheritTenant")}
            disabled={saving}
          />
          <Input
            label={t("opencode.settings.defaultModel")}
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            placeholder={settings.tenantDefaults.defaultModel ?? t("opencode.productSettings.inheritTenant")}
            disabled={saving}
          />
          <div className="md:col-span-2">
            <Input
              label={t("opencode.settings.projectPath")}
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder={settings.tenantDefaults.projectPath ?? settings.suggestedProjectPath}
              disabled={saving}
            />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {t("opencode.productSettings.effectiveHint", {
                agent: settings.effectiveDefaults.defaultAgent ?? "—",
                model: settings.effectiveDefaults.defaultModel ?? "—",
                path: settings.effectiveDefaults.projectPath ?? settings.suggestedProjectPath,
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
      </div>
    </Panel>
  );
}
