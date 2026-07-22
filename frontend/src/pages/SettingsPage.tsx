import { useEffect, useState } from "react";
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
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";

export default function SettingsPage() {
  const { t } = useTranslation();
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

  const toggleSchedule = async (schedule: AutonomousSchedule) => {
    await api.schedules.update(schedule.id, { enabled: !schedule.enabled });
    await load();
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm(t("settings.fixedSchedules.deleteConfirm"))) return;
    await api.schedules.delete(id);
    await load();
  };

  const runScheduleNow = async (id: string) => {
    const { runId } = await api.schedules.runNow(id);
    window.location.href = `/runs/${runId}`;
  };

  if (loading) return <PageLoading message={t("settings.loading")} />;

  return (
    <div className="space-y-10">
      <PageHeader title={t("settings.title")} />
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("settings.metaSchedule.title")}</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("settings.metaSchedule.subtitle")}
        </p>
        {schedules.some((s) => s.scheduleKind === "meta") ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
            {schedules
              .filter((s) => s.scheduleKind === "meta")
              .map((schedule) => (
                <div key={schedule.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{schedule.name}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      {t("settings.metaSchedule.orchestratorEvery", {
                        seconds: schedule.intervalSec,
                        status: schedule.enabled
                          ? t("common.enabled")
                          : t("common.paused"),
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void runScheduleNow(schedule.id)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm"
                    >
                      {t("common.runNow")}
                    </button>
                    <button
                      onClick={() => void toggleSchedule(schedule)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm"
                    >
                      {schedule.enabled ? t("common.pause") : t("common.enable")}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <button
            onClick={() => void api.schedules.ensureMeta().then(() => load())}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
          >
            {t("common.enableMetaSchedule")}
          </button>
        )}
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
                  onClick={() => void runScheduleNow(schedule.id)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm"
                >
                  {t("common.runNow")}
                </button>
                <button
                  onClick={() => void toggleSchedule(schedule)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm"
                >
                  {schedule.enabled ? t("common.pause") : t("common.enable")}
                </button>
                <button
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
  );
}
