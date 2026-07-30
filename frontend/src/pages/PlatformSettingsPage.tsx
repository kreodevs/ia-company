import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type PlatformSettings } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import ModelAutocomplete from "../components/ModelAutocomplete";
import { toast } from "../components/molecules/Sonner";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import TabsBar from "../components/ui/TabsBar";

type PlatformSettingsTab = "general" | "llm" | "email" | "integrations" | "opencode";
const VALID_TABS: PlatformSettingsTab[] = ["general", "llm", "email", "integrations", "opencode"];

export default function PlatformSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as PlatformSettingsTab | null;
  const [activeTab, setActiveTab] = useState<PlatformSettingsTab>(
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "general",
  );

  const setTab = (next: PlatformSettingsTab) => {
    setActiveTab(next);
    setSearchParams(next === "general" ? {} : { tab: next }, { replace: true });
  };

  const load = async () => {
    setSettings(await api.admin.platformSettings.get());
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.admin.platformSettings.update(settings);
      setSettings(updated);
      toast.success(t("admin.platformSettings.saved"));
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const testLlm = async () => {
    setLlmTesting(true);
    setLlmTestResult(null);
    try {
      const result = await api.admin.platformSettings.testLlm();
      if (result.ok) {
        setLlmTestResult(t("admin.platformSettings.defaultLlm.testOk", { text: result.text ?? "OK" }));
        toast.success(t("admin.platformSettings.defaultLlm.testOkShort"));
      } else {
        const detail = [result.error, result.responseBody].filter(Boolean).join("\n\n");
        setLlmTestResult(detail || t("admin.platformSettings.defaultLlm.testFailed"));
        toast.error(t("admin.platformSettings.defaultLlm.testFailedShort"));
      }
    } catch (err) {
      const message = translateApiError(err, t, "admin.platformSettings.defaultLlm.testFailedShort");
      setLlmTestResult(message);
      toast.error(message);
    } finally {
      setLlmTesting(false);
    }
  };

  if (!settings) {
    return <PageLoading message={t("admin.platformSettings.loading")} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link to="/admin" className="interactive text-[var(--color-primary)] hover:underline">
            ← {t("nav.admin")}
          </Link>
        }
        title={t("admin.platformSettings.title")}
        subtitle={t("admin.platformSettings.subtitle")}
      />

      <TabsBar
        tabs={[
          { id: "general", label: t("admin.platformSettings.tabs.general") },
          { id: "llm", label: t("admin.platformSettings.tabs.llm") },
          { id: "email", label: t("admin.platformSettings.tabs.email") },
          { id: "integrations", label: t("admin.platformSettings.tabs.integrations") },
          { id: "opencode", label: t("admin.platformSettings.tabs.opencode") },
        ]}
        activeId={activeTab}
        onChange={(id) => setTab(id as PlatformSettingsTab)}
      />

      {activeTab === "general" && (
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
          <h2 className="font-semibold">{t("admin.platformSettings.general.title")}</h2>
          <label className="block text-sm">
            {t("admin.platformSettings.general.publicUrl")}
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.publicUrl}
              onChange={(e) => setSettings({ ...settings, publicUrl: e.target.value })}
              placeholder="https://app.example.com"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span>{t("admin.platformSettings.general.authRateLimit")}</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={settings.authRateLimitMax}
                onChange={(e) =>
                  setSettings({ ...settings, authRateLimitMax: Number(e.target.value) })
                }
              />
            </label>
            <label className="block text-sm">
              <span>{t("admin.platformSettings.general.executeRateLimit")}</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={settings.executeRateLimitMax}
                onChange={(e) =>
                  setSettings({ ...settings, executeRateLimitMax: Number(e.target.value) })
                }
              />
            </label>
            <label className="block text-sm">
              <span>{t("admin.platformSettings.general.shellTimeout")}</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={settings.shellTimeoutMs}
                onChange={(e) =>
                  setSettings({ ...settings, shellTimeoutMs: Number(e.target.value) })
                }
              />
            </label>
            <label className="block text-sm">
              <span>{t("admin.platformSettings.general.schedulerTick")}</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={settings.schedulerTickMs}
                onChange={(e) =>
                  setSettings({ ...settings, schedulerTickMs: Number(e.target.value) })
                }
              />
            </label>
          </div>
        </section>
      )}

      {activeTab === "llm" && (
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
          <h2 className="font-semibold">{t("admin.platformSettings.defaultLlm.title")}</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t("admin.platformSettings.defaultLlm.subtitle")}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span>{t("common.provider")}</span>
              <select
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={settings.defaultProvider}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultProvider: e.target.value as PlatformSettings["defaultProvider"],
                  })
                }
              >
                <option value="tokenlab">{t("common.tokenlabLemonData")}</option>
                <option value="openrouter">{t("common.openrouter")}</option>
                <option value="custom">{t("common.custom")}</option>
                <option value="replicate">{t("common.replicate")}</option>
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span>{t("settings.llm.defaultModel")}</span>
              {settings.defaultProvider === "openrouter" ||
              settings.defaultProvider === "tokenlab" ||
              settings.defaultProvider === "replicate" ? (
                <ModelAutocomplete
                  provider={settings.defaultProvider}
                  value={settings.defaultModel}
                  onChange={(defaultModel) => setSettings({ ...settings, defaultModel })}
                />
              ) : (
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  value={settings.defaultModel}
                  onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                />
              )}
            </label>
            <label className="block text-sm">
              <span>{t("admin.platformSettings.defaultLlm.temperature")}</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={settings.defaultTemperature}
                onChange={(e) =>
                  setSettings({ ...settings, defaultTemperature: Number(e.target.value) })
                }
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
              <h3 className="text-sm font-medium">
                {t("admin.platformSettings.defaultLlm.tokenlabSection")}
              </h3>
              <label className="block space-y-1 text-sm">
                <span>{t("admin.platformSettings.defaultLlm.apiKey")}</span>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={t("common.apiKeyPlaceholder")}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  value={settings.tokenlabApiKey ?? ""}
                  onChange={(e) => setSettings({ ...settings, tokenlabApiKey: e.target.value })}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t("admin.platformSettings.defaultLlm.baseUrl")}</span>
                <input
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  value={settings.tokenlabBaseUrl}
                  onChange={(e) => setSettings({ ...settings, tokenlabBaseUrl: e.target.value })}
                />
              </label>
            </div>

            <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
              <h3 className="text-sm font-medium">
                {t("admin.platformSettings.defaultLlm.openrouterSection")}
              </h3>
              <label className="block space-y-1 text-sm">
                <span>{t("admin.platformSettings.defaultLlm.apiKey")}</span>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={t("common.apiKeyPlaceholder")}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  value={settings.openrouterApiKey ?? ""}
                  onChange={(e) => setSettings({ ...settings, openrouterApiKey: e.target.value })}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t("admin.platformSettings.defaultLlm.baseUrl")}</span>
                <input
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-sm"
                  value={settings.openrouterBaseUrl}
                  onChange={(e) => setSettings({ ...settings, openrouterBaseUrl: e.target.value })}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t("admin.platformSettings.defaultLlm.httpReferer")}</span>
                <input
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-sm"
                  value={settings.openrouterReferer}
                  onChange={(e) => setSettings({ ...settings, openrouterReferer: e.target.value })}
                />
              </label>
            </div>

            <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
              <h3 className="text-sm font-medium">
                {t("admin.platformSettings.defaultLlm.customSection")}
              </h3>
              <label className="block space-y-1 text-sm">
                <span>{t("admin.platformSettings.defaultLlm.apiKey")}</span>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={t("common.apiKeyPlaceholder")}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  value={settings.customApiKey ?? ""}
                  onChange={(e) => setSettings({ ...settings, customApiKey: e.target.value })}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t("admin.platformSettings.defaultLlm.baseUrl")}</span>
                <input
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  placeholder={t("common.baseUrl")}
                  value={settings.customBaseUrl}
                  onChange={(e) => setSettings({ ...settings, customBaseUrl: e.target.value })}
                />
              </label>
            </div>

            <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
              <h3 className="text-sm font-medium">
                {t("admin.platformSettings.defaultLlm.replicateSection")}
              </h3>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {t("admin.platformSettings.defaultLlm.replicateHint")}
              </p>
              <label className="block space-y-1 text-sm">
                <span>{t("admin.platformSettings.defaultLlm.apiKey")}</span>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={t("common.apiKeyPlaceholder")}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  value={settings.replicateApiKey ?? ""}
                  onChange={(e) => setSettings({ ...settings, replicateApiKey: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              disabled={llmTesting}
              onClick={() => void testLlm()}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-muted)] disabled:opacity-50"
            >
              {llmTesting
                ? t("admin.platformSettings.defaultLlm.testRunning")
                : t("admin.platformSettings.defaultLlm.testButton")}
            </button>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {t("admin.platformSettings.defaultLlm.testHint")}
            </p>
          </div>
          {llmTestResult && (
            <pre className="max-h-48 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs whitespace-pre-wrap">
              {llmTestResult}
            </pre>
          )}
        </section>
      )}

      {activeTab === "email" && (
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
          <h2 className="font-semibold">{t("admin.platformSettings.email.title")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              {t("admin.platformSettings.email.resendApiKey")}
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={settings.resendApiKey ?? ""}
                onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              {t("admin.platformSettings.email.fromAddress")}
              <input
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={settings.emailFrom}
                onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                placeholder={t("admin.platformSettings.email.fromPlaceholder")}
              />
            </label>
          </div>
        </section>
      )}

      {activeTab === "integrations" && (
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
          <h2 className="font-semibold">{t("admin.platformSettings.github.title")}</h2>
          <label className="block text-sm">
            {t("admin.platformSettings.github.token")}
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              value={settings.githubApiKey ?? ""}
              onChange={(e) => setSettings({ ...settings, githubApiKey: e.target.value })}
              placeholder={t("admin.platformSettings.github.tokenPlaceholder")}
            />
          </label>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {t("admin.platformSettings.github.hint")}
          </p>
        </section>
      )}

      {activeTab === "opencode" && (
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
          <h2 className="font-semibold">{t("admin.platformSettings.opencode.title")}</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t("admin.platformSettings.opencode.subtitle")}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.opencodeEnabled}
              onChange={(e) => setSettings({ ...settings, opencodeEnabled: e.target.checked })}
            />
            {t("admin.platformSettings.opencode.enabled")}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span>{t("admin.platformSettings.opencode.defaultPollInterval")}</span>
              <input
                type="number"
                min={1000}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={settings.opencodeDefaultPollIntervalMs}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    opencodeDefaultPollIntervalMs: Number(e.target.value) || 5000,
                  })
                }
              />
            </label>
            <label className="block text-sm">
              <span>{t("admin.platformSettings.opencode.defaultMaxWait")}</span>
              <input
                type="number"
                min={60_000}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                value={settings.opencodeDefaultMaxWaitMs}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    opencodeDefaultMaxWaitMs: Number(e.target.value) || 3_600_000,
                  })
                }
              />
            </label>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {t("admin.platformSettings.opencode.hint")}
          </p>
        </section>
      )}

      <button
        disabled={saving}
        onClick={() => void save()}
        className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
      >
        {saving ? t("common.saving") : t("admin.platformSettings.save")}
      </button>
    </div>
  );
}
