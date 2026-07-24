import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  api,
  type AutonomousSchedule,
  type TenantIntegrationsConfig,
  type TenantLlmConfig,
  type TenantMonthlyUsage,
  type TenantNotificationConfig,
  type TenantOpencodeConfig,
  type TenantUsageLimits,
  type Workflow,
} from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import TabsBar from "../components/ui/TabsBar";
import OrchestrationPlanPanel from "../components/settings/OrchestrationPlanPanel";
import TenantSmtpSection from "../components/settings/TenantSmtpSection";
import TenantMcpSettingsPanel from "../components/settings/TenantMcpSettingsPanel";

type SettingsTab = "general" | "llm" | "opencode" | "integrations" | "mcp" | "notifications" | "limits" | "schedules";
const VALID_TABS: SettingsTab[] = ["general", "llm", "opencode", "integrations", "mcp", "notifications", "limits", "schedules"];

export default function SettingsPage() {
  const { t } = useTranslation();
  const [llm, setLlm] = useState<Partial<TenantLlmConfig>>({});
  const [opencode, setOpencode] = useState<Partial<TenantOpencodeConfig>>({});
  const [integrations, setIntegrations] = useState<Partial<TenantIntegrationsConfig>>({});
  const [githubToken, setGithubToken] = useState("");
  const [notifications, setNotifications] = useState<Partial<TenantNotificationConfig>>({});
  const [limits, setLimits] = useState<Partial<TenantUsageLimits>>({});
  const [usage, setUsage] = useState<TenantMonthlyUsage | null>(null);
  const [schedules, setSchedules] = useState<AutonomousSchedule[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLlm, setSavingLlm] = useState(false);
  const [savingOpencode, setSavingOpencode] = useState(false);
  const [testingOpencode, setTestingOpencode] = useState(false);
  const [opencodeTestResult, setOpencodeTestResult] = useState<string | null>(null);
  const [opencodePassword, setOpencodePassword] = useState("");
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [testingGithub, setTestingGithub] = useState(false);
  const [githubTestResult, setGithubTestResult] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "general",
  );
  const setTab = (next: SettingsTab) => {
    setActiveTab(next);
    setSearchParams(next === "general" ? {} : { tab: next }, { replace: true });
  };

  const load = async () => {
    setLoading(true);
    const [llmConfig, opencodeConfig, integrationsConfig, notif, limitConfig, usageData, scheduleList, workflowList] =
      await Promise.all([
        api.tenantSettings.getLlm(),
        api.tenantSettings.getOpencode(),
        api.tenantSettings.getIntegrations(),
        api.tenantSettings.getNotifications(),
        api.tenantSettings.getLimits(),
        api.tenantSettings.getUsage(),
        api.schedules.list(),
        api.workflows.list(),
      ]);
    setLlm(llmConfig);
    setOpencode(opencodeConfig);
    setIntegrations(integrationsConfig);
    setGithubToken("");
    setOpencodePassword("");
    setNotifications(notif);
    setLimits(limitConfig);
    setUsage(usageData);
    setSchedules(scheduleList);
    setWorkflows(workflowList);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const saveLlm = async () => {
    setSavingLlm(true);
    try {
      const updated = await api.tenantSettings.updateLlm({
        defaultModel: llm.defaultModel ?? null,
        maxCostUsdPerRun: llm.maxCostUsdPerRun ?? null,
      });
      setLlm(updated);
    } finally {
      setSavingLlm(false);
    }
  };

  const providerLabel = (provider: string) => {
    if (provider === "openrouter") return t("common.openrouter");
    if (provider === "custom") return t("common.custom");
    return t("common.tokenlabLemonData");
  };

  const saveOpencode = async () => {
    setSavingOpencode(true);
    setOpencodeTestResult(null);
    try {
      const updated = await api.tenantSettings.updateOpencode({
        enabled: opencode.enabled,
        baseUrl: opencode.baseUrl ?? null,
        username: opencode.username ?? null,
        password: opencodePassword || undefined,
        pollIntervalMs: opencode.pollIntervalMs,
        maxWaitMs: opencode.maxWaitMs,
        autoApprovePermissions: opencode.autoApprovePermissions,
      });
      setOpencode(updated);
      setOpencodePassword("");
    } finally {
      setSavingOpencode(false);
    }
  };

  const testOpencode = async () => {
    setTestingOpencode(true);
    setOpencodeTestResult(null);
    try {
      if (opencodePassword) {
        await api.tenantSettings.updateOpencode({
          enabled: opencode.enabled,
          baseUrl: opencode.baseUrl ?? null,
          username: opencode.username ?? null,
          password: opencodePassword,
        });
      }
      const result = await api.tenantSettings.testOpencode();
      setOpencodeTestResult(
        result.ok
          ? `${t("opencode.settings.testOk")}${result.version ? ` (${result.version})` : ""}`
          : `${t("opencode.settings.testFail")}: ${result.error ?? ""}`,
      );
    } finally {
      setTestingOpencode(false);
    }
  };

  const saveNotifications = async () => {
    setSavingNotifications(true);
    try {
      setNotifications(await api.tenantSettings.updateNotifications(notifications));
    } finally {
      setSavingNotifications(false);
    }
  };

  const saveIntegrations = async () => {
    setSavingIntegrations(true);
    setGithubTestResult(null);
    try {
      const updated = await api.tenantSettings.updateIntegrations({
        githubToken: githubToken || undefined,
        githubUsername: integrations.githubUsername ?? null,
      });
      setIntegrations(updated);
      setGithubToken("");
    } finally {
      setSavingIntegrations(false);
    }
  };

  const testGithub = async () => {
    setTestingGithub(true);
    setGithubTestResult(null);
    try {
      if (githubToken) {
        await api.tenantSettings.updateIntegrations({ githubToken });
      }
      const result = await api.tenantSettings.testGithub();
      setGithubTestResult(result.ok ? result.message : result.message);
    } finally {
      setTestingGithub(false);
    }
  };

  const saveLimits = async () => {
    setSavingLimits(true);
    try {
      setLimits(await api.tenantSettings.updateLimits(limits));
      setUsage(await api.tenantSettings.getUsage());
    } finally {
      setSavingLimits(false);
    }
  };

  if (loading) return <PageLoading message={t("settings.loading")} />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} />

      <TabsBar
        tabs={[
          { id: "general", label: t("settings.tabs.general") },
          { id: "llm", label: t("settings.tabs.llm") },
          { id: "opencode", label: t("settings.tabs.opencode") },
          { id: "integrations", label: t("settings.tabs.integrations") },
          { id: "mcp", label: t("settings.tabs.mcp") },
          { id: "notifications", label: t("settings.tabs.notifications") },
          { id: "limits", label: t("settings.tabs.limits") },
          { id: "schedules", label: t("settings.tabs.schedules") },
        ]}
        activeId={activeTab}
        onChange={(id) => setTab(id as SettingsTab)}
      />

      {activeTab === "general" && (
        <div className="space-y-4">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{t("settings.interests.heading")}</h2>
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="font-medium">{t("settings.interests.cardTitle")}</p>
            <p className="text-[var(--color-muted-foreground)]">
              {t("settings.interests.cardSubtitle")}
            </p>
          </div>
          <Link
            to="/settings/interests"
            className="interactive inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
          >
            {t("settings.interests.open")}
          </Link>
        </div>
      </section>

          {usage && (
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
              <h2 className="font-semibold">{t("settings.usage.title")}</h2>
              <p className="mt-2 text-[var(--color-muted-foreground)]">
                {t("settings.usage.summary", {
                  runs: usage.runs,
                  tokens: usage.totalTokens.toLocaleString(),
                  cost: usage.totalCostUsd.toFixed(4),
                  since: new Date(usage.periodStart).toLocaleDateString(),
                })}
              </p>
            </section>
          )}
        </div>
      )}

      {activeTab === "llm" && (
        <div className="space-y-4">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{t("settings.llm.title")}</h2>
        <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {t("settings.llm.platformManaged")}
        </p>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[var(--color-muted-foreground)]">{t("settings.llm.activeProvider")}</dt>
              <dd className="mt-1 font-medium">
                {llm.platformProvider ? providerLabel(llm.platformProvider) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted-foreground)]">{t("settings.llm.platformModel")}</dt>
              <dd className="mt-1 font-medium">{llm.platformModel ?? "—"}</dd>
            </div>
          </dl>
          <p
            className={`mt-3 text-xs ${llm.platformConfigured ? "text-[var(--color-accent)]" : "text-[var(--color-destructive)]"}`}
          >
            {llm.platformConfigured ? t("settings.llm.configured") : t("settings.llm.notConfigured")}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>{t("settings.llm.tenantModelOverride")}</span>
            <input
              value={llm.defaultModel ?? ""}
              onChange={(e) => setLlm({ ...llm, defaultModel: e.target.value || null })}
              placeholder={llm.platformModel ?? ""}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {t("settings.llm.tenantModelHint")}
            </span>
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t("settings.llm.maxCostPerRun")}</span>
            <input
              type="number"
              step="0.01"
              value={llm.maxCostUsdPerRun ?? ""}
              onChange={(e) =>
                setLlm({
                  ...llm,
                  maxCostUsdPerRun: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
        </div>
        <button
          disabled={savingLlm}
          onClick={() => void saveLlm()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {savingLlm ? t("common.saving") : t("settings.llm.save")}
        </button>
      </section>
        </div>
      )}

      {activeTab === "opencode" && (
        <div className="space-y-4">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{t("opencode.settings.title")}</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">{t("opencode.settings.subtitle")}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">{t("opencode.settings.productHint")}</p>
            <p
              className={`text-xs ${opencode.configured ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`}
            >
              {opencode.configured ? t("opencode.settings.configured") : t("opencode.settings.notConfigured")}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={opencode.enabled ?? false}
                onChange={(e) => setOpencode({ ...opencode, enabled: e.target.checked })}
              />
              {t("opencode.settings.enabled")}
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-1 text-sm md:col-span-2">
                <span>{t("opencode.settings.baseUrl")}</span>
                <input
                  value={opencode.baseUrl ?? ""}
                  onChange={(e) => setOpencode({ ...opencode, baseUrl: e.target.value || null })}
                  placeholder="https://opencode.example.com"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t("opencode.settings.username")}</span>
                <input
                  value={opencode.username ?? "opencode"}
                  onChange={(e) => setOpencode({ ...opencode, username: e.target.value || null })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t("opencode.settings.password")}</span>
                <input
                  type="password"
                  value={opencodePassword}
                  onChange={(e) => setOpencodePassword(e.target.value)}
                  placeholder={opencode.password ?? ""}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
                />
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {t("opencode.settings.passwordHint")}
                </span>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={opencode.autoApprovePermissions ?? true}
                onChange={(e) => setOpencode({ ...opencode, autoApprovePermissions: e.target.checked })}
              />
              {t("opencode.settings.autoApprovePermissions")}
            </label>
            {opencodeTestResult && (
              <p className="text-sm text-[var(--color-muted-foreground)]">{opencodeTestResult}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                disabled={savingOpencode}
                onClick={() => void saveOpencode()}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
              >
                {savingOpencode ? t("common.saving") : t("opencode.settings.save")}
              </button>
              <button
                disabled={testingOpencode}
                onClick={() => void testOpencode()}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-50"
              >
                {testingOpencode ? t("common.loading") : t("opencode.settings.test")}
              </button>
            </div>
          </section>
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="space-y-4">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{t("settings.integrations.title")}</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {t("settings.integrations.subtitle")}
            </p>
            <p
              className={`text-xs ${integrations.githubConfigured ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`}
            >
              {integrations.githubConfigured
                ? t("settings.integrations.configured", {
                    username: integrations.githubUsername ?? "GitHub",
                  })
                : t("settings.integrations.notConfigured")}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-1 text-sm md:col-span-2">
                <span>{t("settings.integrations.githubToken")}</span>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder={integrations.githubToken ?? ""}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
                />
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {t("settings.integrations.githubTokenHint")}
                </span>
              </label>
            </div>
            {githubTestResult && (
              <p className="text-sm text-[var(--color-muted-foreground)]">{githubTestResult}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                disabled={savingIntegrations}
                onClick={() => void saveIntegrations()}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
              >
                {savingIntegrations ? t("common.saving") : t("settings.integrations.save")}
              </button>
              <button
                disabled={testingGithub}
                onClick={() => void testGithub()}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-50"
              >
                {testingGithub ? t("common.loading") : t("settings.integrations.testGithub")}
              </button>
            </div>
          </section>

          <TenantSmtpSection
            integrations={integrations}
            onChange={setIntegrations}
            onSaved={setIntegrations}
          />
        </div>
      )}

      {activeTab === "mcp" && (
        <div className="space-y-4">
          <TenantMcpSettingsPanel />
        </div>
      )}

      {activeTab === "limits" && (
        <div className="space-y-4">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{t("settings.limits.title")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-1 text-sm">
            <span>{t("settings.limits.maxRuns")}</span>
            <input
              type="number"
              value={limits.maxRunsPerMonth ?? ""}
              onChange={(e) =>
                setLimits({
                  ...limits,
                  maxRunsPerMonth: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t("settings.limits.maxCost")}</span>
            <input
              type="number"
              step="0.01"
              value={limits.maxCostUsdPerMonth ?? ""}
              onChange={(e) =>
                setLimits({
                  ...limits,
                  maxCostUsdPerMonth: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t("settings.limits.maxTokens")}</span>
            <input
              type="number"
              value={limits.maxTokensPerMonth ?? ""}
              onChange={(e) =>
                setLimits({
                  ...limits,
                  maxTokensPerMonth: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
        </div>
        <button
          disabled={savingLimits}
          onClick={() => void saveLimits()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {savingLimits ? t("common.saving") : t("settings.limits.save")}
        </button>
      </section>

        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-4">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{t("settings.notifications.title")}</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("settings.notifications.subtitle")}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>{t("settings.webhookUrl")}</span>
            <input
              value={notifications.webhookUrl ?? ""}
              onChange={(e) => setNotifications({ ...notifications, webhookUrl: e.target.value || null })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t("settings.slackWebhookUrl")}</span>
            <input
              value={notifications.slackWebhookUrl ?? ""}
              onChange={(e) =>
                setNotifications({ ...notifications, slackWebhookUrl: e.target.value || null })
              }
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
          <label className="col-span-full block space-y-1 text-sm">
            <span>{t("settings.emailRecipients")}</span>
            <input
              value={notifications.emailRecipients ?? ""}
              onChange={(e) =>
                setNotifications({ ...notifications, emailRecipients: e.target.value || null })
              }
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifications.notifyOnComplete ?? true}
              onChange={(e) =>
                setNotifications({ ...notifications, notifyOnComplete: e.target.checked })
              }
            />
            {t("settings.notifications.onComplete")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifications.notifyOnFail ?? true}
              onChange={(e) => setNotifications({ ...notifications, notifyOnFail: e.target.checked })}
            />
            {t("settings.notifications.onFail")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifications.notifyInApp ?? true}
              onChange={(e) =>
                setNotifications({ ...notifications, notifyInApp: e.target.checked })
              }
            />
            {t("settings.notifications.notifyInApp")}
          </label>
        </div>
        <button
          disabled={savingNotifications}
          onClick={() => void saveNotifications()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {savingNotifications ? t("common.saving") : t("settings.notifications.save")}
        </button>
      </section>

        </div>
      )}

      {activeTab === "schedules" && (
        <OrchestrationPlanPanel schedules={schedules} workflows={workflows} onRefresh={load} />
      )}
    </div>
  );
}
