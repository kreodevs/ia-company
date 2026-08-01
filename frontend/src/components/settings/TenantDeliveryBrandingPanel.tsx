import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type TenantDeliveryBranding } from "../../lib/api";
import Button from "../ui/Button";
import Input from "../ui/Input";
import PageLoading from "../ui/PageLoading";

export default function TenantDeliveryBrandingPanel() {
  const { t } = useTranslation();
  const [branding, setBranding] = useState<TenantDeliveryBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.tenantSettings
      .getDeliveryBranding()
      .then(setBranding)
      .catch(() => setBranding(null))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!branding) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.tenantSettings.updateDeliveryBranding({
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        footerText: branding.footerText,
        confidentialityNotice: branding.confidentialityNotice,
        contactEmail: branding.contactEmail,
      });
      setBranding(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading message={t("settings.delivery.loading")} />;
  if (!branding) return <p className="office-empty">{t("settings.delivery.loadError")}</p>;

  return (
    <section className="settings-panel">
      <h2 className="settings-panel-title">{t("settings.delivery.title")}</h2>
      <p className="settings-panel-subtitle">{t("settings.delivery.subtitle")}</p>

      <div className="settings-form-grid">
        <Input
          label={t("settings.delivery.logoUrl")}
          value={branding.logoUrl ?? ""}
          onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value || null })}
          placeholder="https://…"
        />
        <Input
          label={t("settings.delivery.contactEmail")}
          type="email"
          value={branding.contactEmail ?? ""}
          onChange={(e) => setBranding({ ...branding, contactEmail: e.target.value || null })}
        />
        <label className="settings-color-field">
          <span>{t("settings.delivery.primaryColor")}</span>
          <input
            type="color"
            value={branding.primaryColor}
            onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
          />
        </label>
        <Input
          label={t("settings.delivery.footerText")}
          value={branding.footerText ?? ""}
          onChange={(e) => setBranding({ ...branding, footerText: e.target.value || null })}
        />
        <label className="settings-textarea-field">
          <span>{t("settings.delivery.confidentialityNotice")}</span>
          <textarea
            rows={4}
            value={branding.confidentialityNotice ?? ""}
            onChange={(e) =>
              setBranding({ ...branding, confidentialityNotice: e.target.value || null })
            }
            placeholder={t("settings.delivery.confidentialityPlaceholder")}
          />
        </label>
      </div>

      <div className="settings-actions">
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
        {saved ? <span className="settings-saved-hint">{t("settings.delivery.saved")}</span> : null}
      </div>
    </section>
  );
}
