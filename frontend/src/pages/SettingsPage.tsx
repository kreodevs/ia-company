import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  api,
  type AutonomousSchedule,
  type TenantLlmConfig,
  type TenantMonthlyUsage,
  type TenantNotificationConfig,
  type TenantUsageLimits,
  type Workflow,
} from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import TabsBar from "../components/ui/TabsBar";

type SettingsTab = "general" | "llm" | "notifications" | "limits" | "schedules";
const VALID_TABS: SettingsTab[] = ["general", "llm", "notifications", "limits", "schedules"];

export default function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [llm, setLlm] = useState<Partial<TenantLlmConfig>>({});
  const [notifications, setNotifications] = useState<Partial<TenantNotificationConfig>>({});
  const [limits, setLimits] = useState<Partial<TenantUsageLimits>>({});
  const [usage, setUsage] = useState<TenantMonthlyUsage | null>(null);
  const [schedules, setSchedules] = useState<AutonomousSchedule[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLlm, setSavingLlm] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ name: "", workflowId: "", intervalSec: 1800 });
  const [metaForm, setMetaForm] = useState({ name: "", intervalSec: 1800 });
  const [savingMeta, setSavingMeta] = useState(false);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);
  const [scheduleActionError, setScheduleActionError] = useState<string | null>(null);
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
    const [llmConfig, notif, limitConfig, usageData, scheduleList, workflowList] =
      await Promise.all([
        api.tenantSettings.getLlm(),
        api.tenantSettings.getNotifications(),
        api.tenantSettings.getLimits(),
        api.tenantSettings.getUsage(),
        api.schedules.list(),
        api.workflows.list(),
      ]);
    setLlm(llmConfig);
    setNotifications(notif);
    setLimits(limitConfig);
    setUsage(usageData);
    setSchedules(scheduleList);
    setWorkflows(workflowList);
    const meta = scheduleList.find((s) => s.scheduleKind === "meta");
    if (meta) {
      setMetaForm({ name: meta.name, intervalSec: meta.intervalSec });
    }
    if (workflowList[0] && !scheduleForm.workflowId) {
      setScheduleForm((f) => ({ ...f, workflowId: workflowList[0].id }));
    }
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

  const saveNotifications = async () => {
    setSavingNotifications(true);
    try {
      setNotifications(await api.tenantSettings.updateNotifications(notifications));
    } finally {
      setSavingNotifications(false);
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

  const createSchedule = async () => {
    await api.schedules.create(scheduleForm);
    setScheduleForm({ name: "", workflowId: workflows[0]?.id ?? "", intervalSec: 1800 });
    await load();
  };

  const saveMetaSchedule = async () => {
    const meta = schedules.find((s) => s.scheduleKind === "meta");
    if (!meta) return;

    setSavingMeta(true);
    setScheduleActionError(null);
    try {
      await api.schedules.update(meta.id, {
        name: metaForm.name.trim() || meta.name,
        intervalSec: Math.max(60, metaForm.intervalSec || 1800),
      });
      await load();
    } catch (err) {
      setScheduleActionError(translateApiError(err, t, "common.saveFailed"));
    } finally {
      setSavingMeta(false);
    }
  };

  const toggleSchedule = async (schedule: AutonomousSchedule) => {
    setScheduleActionError(null);
    try {
      await api.schedules.update(schedule.id, { enabled: !schedule.enabled });
      await load();
    } catch (err) {
      setScheduleActionError(translateApiError(err, t, "common.requestFailed"));
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm(t("settings.fixedSchedules.deleteConfirm"))) return;
    setScheduleActionError(null);
    try {
      await api.schedules.delete(id);
      await load();
    } catch (err) {
      setScheduleActionError(translateApiError(err, t, "common.deleteFailed"));
    }
  };

  const runScheduleNow = async (id: string) => {
    setRunningScheduleId(id);
    setScheduleActionError(null);
    try {
      const { runId } = await api.schedules.runNow(id);
      navigate(`/runs/${runId}`);
    } catch (err) {
      setScheduleActionError(translateApiError(err, t, "settings.metaSchedule.runFailed"));
    } finally {
      setRunningScheduleId(null);
    }
  };

  const metaSchedule = schedules.find((s) => s.scheduleKind === "meta");

  if (loading) return <PageLoading message={t("settings.loading")} />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} />

      <TabsBar
        tabs={[
          { id: "general", label: t("settings.tabs.general") },
          { id: "llm", label: t("settings.tabs.llm") },
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
        <div className="space-y-4">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{t("settings.metaSchedule.title")}</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("settings.metaSchedule.subtitle")}
        </p>
        {metaSchedule ? (
          <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {t("settings.metaSchedule.editHint")}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>{t("settings.metaSchedule.nameLabel")}</span>
                <input
                  value={metaForm.name}
                  onChange={(e) => setMetaForm({ ...metaForm, name: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t("settings.metaSchedule.intervalLabel")}</span>
                <input
                  type="number"
                  min={60}
                  value={metaForm.intervalSec}
                  onChange={(e) =>
                    setMetaForm({
                      ...metaForm,
                      intervalSec: Number(e.target.value) || 1800,
                    })
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  title={t("common.intervalSeconds")}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={savingMeta}
                onClick={() => void saveMetaSchedule()}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
              >
                {savingMeta ? t("common.saving") : t("settings.metaSchedule.save")}
              </button>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {t("settings.metaSchedule.orchestratorEvery", {
                  seconds: metaSchedule.intervalSec,
                  status: metaSchedule.enabled ? t("common.enabled") : t("common.paused"),
                })}
                {metaSchedule.nextRunAt &&
                  ` · ${t("settings.metaSchedule.nextRun", {
                    date: new Date(metaSchedule.nextRunAt).toLocaleString(),
                  })}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4">
              <button
                type="button"
                disabled={runningScheduleId === metaSchedule.id}
                onClick={() => void runScheduleNow(metaSchedule.id)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {runningScheduleId === metaSchedule.id ? t("common.starting") : t("common.runNow")}
              </button>
              <button
                type="button"
                onClick={() => void toggleSchedule(metaSchedule)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
              >
                {metaSchedule.enabled ? t("common.pause") : t("common.enable")}
              </button>
              <Link
                to="/ops"
                className="interactive rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
              >
                {t("ops.title")}
              </Link>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void api.schedules.ensureMeta().then(() => load())}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
          >
            {t("common.enableMetaSchedule")}
          </button>
        )}
        {scheduleActionError ? (
          <p className="text-sm text-[var(--color-destructive)]" role="alert">
            {scheduleActionError}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("settings.fixedSchedules.title")}</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("settings.fixedSchedules.subtitle")}
        </p>

        <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <input
            placeholder={t("settings.fixedSchedules.namePlaceholder")}
            value={scheduleForm.name}
            onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
            className="min-w-[160px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
          <select
            value={scheduleForm.workflowId}
            onChange={(e) => setScheduleForm({ ...scheduleForm, workflowId: e.target.value })}
            className="min-w-[160px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          >
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={60}
            value={scheduleForm.intervalSec}
            onChange={(e) =>
              setScheduleForm({ ...scheduleForm, intervalSec: Number(e.target.value) || 1800 })
            }
            className="w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            title={t("common.intervalSeconds")}
          />
          <button
            type="button"
            disabled={!scheduleForm.name.trim() || !scheduleForm.workflowId}
            onClick={() => void createSchedule()}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {t("common.addSchedule")}
          </button>
        </div>

        <ul className="space-y-2">
          {schedules.filter((s) => s.scheduleKind !== "meta").map((schedule) => (
            <li
              key={schedule.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
            >
              <div>
                <div className="font-medium">{schedule.name}</div>
                <div className="text-xs text-[var(--color-muted-foreground)]">
                  {t("settings.fixedSchedules.every", {
                    seconds: schedule.intervalSec,
                    status: schedule.enabled
                      ? t("common.enabled")
                      : t("common.paused"),
                  })}
                  {schedule.nextRunAt &&
                    t("settings.fixedSchedules.nextRun", {
                      date: new Date(schedule.nextRunAt).toLocaleString(),
                    })}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={runningScheduleId === schedule.id}
                  onClick={() => void runScheduleNow(schedule.id)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm disabled:opacity-50"
                >
                  {runningScheduleId === schedule.id ? t("common.starting") : t("common.runNow")}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleSchedule(schedule)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm"
                >
                  {schedule.enabled ? t("common.pause") : t("common.enable")}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSchedule(schedule.id)}
                  className="rounded-lg border border-[var(--color-destructive)] px-3 py-1 text-sm text-[var(--color-destructive)]"
                >
                  {t("common.delete")}
                </button>
              </div>
            </li>
          ))}
          {schedules.filter((s) => s.scheduleKind !== "meta").length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">{t("settings.fixedSchedules.empty")}</p>
          )}
        </ul>
      </section>
        </div>
      )}
    </div>
  );
}
