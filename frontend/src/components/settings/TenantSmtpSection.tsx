import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type TenantIntegrationsConfig } from "../../lib/api";

type Props = {
  integrations: Partial<TenantIntegrationsConfig>;
  onChange: (next: Partial<TenantIntegrationsConfig>) => void;
  onSaved: (next: TenantIntegrationsConfig) => void;
};

export default function TenantSmtpSection({ integrations, onChange, onSaved }: Props) {
  const { t } = useTranslation();
  const [smtpPassword, setSmtpPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const updated = await api.tenantSettings.updateIntegrations({
        smtpHost: integrations.smtpHost ?? null,
        smtpPort: integrations.smtpPort ?? null,
        smtpSecure: integrations.smtpSecure ?? true,
        smtpUser: integrations.smtpUser ?? null,
        smtpPassword: smtpPassword || undefined,
        smtpFromEmail: integrations.smtpFromEmail ?? null,
        smtpFromName: integrations.smtpFromName ?? null,
        smtpEnabled: integrations.smtpEnabled ?? false,
        smtpAllowedRecipients: integrations.smtpAllowedRecipients ?? null,
        smtpMaxPerDay: integrations.smtpMaxPerDay ?? 20,
      });
      onSaved(updated);
      setSmtpPassword("");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (smtpPassword) {
        await api.tenantSettings.updateIntegrations({ smtpPassword });
      }
      const result = await api.tenantSettings.testSmtp();
      setTestResult(result.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div>
        <h3 className="text-base font-semibold">{t("settings.smtp.title")}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t("settings.smtp.subtitle")}</p>
        <p
          className={`mt-2 text-xs ${integrations.smtpConfigured ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`}
        >
          {integrations.smtpConfigured
            ? t("settings.smtp.configured")
            : t("settings.smtp.notConfigured")}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={integrations.smtpEnabled ?? false}
          onChange={(e) => onChange({ ...integrations, smtpEnabled: e.target.checked })}
        />
        {t("settings.smtp.enabled")}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm md:col-span-2">
          <span>{t("settings.smtp.host")}</span>
          <input
            value={integrations.smtpHost ?? ""}
            onChange={(e) => onChange({ ...integrations, smtpHost: e.target.value || null })}
            placeholder="smtp.example.com"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("settings.smtp.port")}</span>
          <input
            type="number"
            value={integrations.smtpPort ?? ""}
            onChange={(e) =>
              onChange({
                ...integrations,
                smtpPort: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="465"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={integrations.smtpSecure ?? true}
            onChange={(e) => onChange({ ...integrations, smtpSecure: e.target.checked })}
          />
          {t("settings.smtp.secure")}
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("settings.smtp.user")}</span>
          <input
            value={integrations.smtpUser ?? ""}
            onChange={(e) => onChange({ ...integrations, smtpUser: e.target.value || null })}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("settings.smtp.password")}</span>
          <input
            type="password"
            value={smtpPassword}
            onChange={(e) => setSmtpPassword(e.target.value)}
            placeholder={integrations.smtpPassword ?? ""}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("settings.smtp.fromEmail")}</span>
          <input
            type="email"
            value={integrations.smtpFromEmail ?? ""}
            onChange={(e) => onChange({ ...integrations, smtpFromEmail: e.target.value || null })}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("settings.smtp.fromName")}</span>
          <input
            value={integrations.smtpFromName ?? ""}
            onChange={(e) => onChange({ ...integrations, smtpFromName: e.target.value || null })}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm md:col-span-2">
          <span>{t("settings.smtp.allowedRecipients")}</span>
          <input
            value={integrations.smtpAllowedRecipients ?? ""}
            onChange={(e) =>
              onChange({ ...integrations, smtpAllowedRecipients: e.target.value || null })
            }
            placeholder="partner@company.com, alerts@company.com"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {t("settings.smtp.allowedRecipientsHint")}
          </span>
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("settings.smtp.maxPerDay")}</span>
          <input
            type="number"
            min={1}
            max={200}
            value={integrations.smtpMaxPerDay ?? 20}
            onChange={(e) =>
              onChange({
                ...integrations,
                smtpMaxPerDay: e.target.value ? Number(e.target.value) : 20,
              })
            }
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
      </div>

      {testResult && <p className="text-sm text-[var(--color-muted-foreground)]">{testResult}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {saving ? t("common.saving") : t("settings.smtp.save")}
        </button>
        <button
          disabled={testing}
          onClick={() => void test()}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-50"
        >
          {testing ? t("common.loading") : t("settings.smtp.test")}
        </button>
      </div>
    </section>
  );
}
