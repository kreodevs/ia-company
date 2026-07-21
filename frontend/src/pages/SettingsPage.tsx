import { useEffect, useState } from "react";
import {
  api,
  type AutonomousSchedule,
  type TenantLlmConfig,
  type TenantMonthlyUsage,
  type TenantNotificationConfig,
  type TenantUsageLimits,
  type Workflow,
} from "../lib/api";

export default function SettingsPage() {
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
        provider: llm.provider ?? undefined,
        baseUrl: llm.baseUrl ?? undefined,
        defaultModel: llm.defaultModel ?? undefined,
        maxCostUsdPerRun: llm.maxCostUsdPerRun ?? undefined,
        apiKey: llm.apiKey && llm.apiKey !== "••••••••" ? llm.apiKey : undefined,
      });
      setLlm(updated);
    } finally {
      setSavingLlm(false);
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
    if (!confirm("Delete this schedule?")) return;
    await api.schedules.delete(id);
    await load();
  };

  const runScheduleNow = async (id: string) => {
    const { runId } = await api.schedules.runNow(id);
    window.location.href = `/runs/${runId}`;
  };

  if (loading) return <p className="text-[var(--color-muted-foreground)]">Loading settings…</p>;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">Tenant Settings</h1>
        <h2 className="text-lg font-semibold">LLM configuration</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Provider</span>
            <select
              value={llm.provider ?? ""}
              onChange={(e) => setLlm({ ...llm, provider: e.target.value || null })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            >
              <option value="">Platform default</option>
              <option value="tokenlab">TokenLab</option>
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Default model</span>
            <input
              value={llm.defaultModel ?? ""}
              onChange={(e) => setLlm({ ...llm, defaultModel: e.target.value || null })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>API key</span>
            <input
              type="password"
              placeholder={llm.apiKey === "••••••••" ? "••••••••" : "Leave empty to keep current"}
              onChange={(e) => setLlm({ ...llm, apiKey: e.target.value || undefined })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Max cost per run (USD)</span>
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
          {savingLlm ? "Saving…" : "Save LLM settings"}
        </button>
      </section>

      {usage && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
          <h2 className="font-semibold">Monthly usage</h2>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            {usage.runs} runs · {usage.totalTokens.toLocaleString()} tokens · $
            {usage.totalCostUsd.toFixed(4)} since {new Date(usage.periodStart).toLocaleDateString()}
          </p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Monthly limits</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-1 text-sm">
            <span>Max runs / month</span>
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
            <span>Max cost / month (USD)</span>
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
            <span>Max tokens / month</span>
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
          {savingLimits ? "Saving…" : "Save usage limits"}
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Webhook, Slack, or email (via Resend) when workflows complete or fail.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Webhook URL</span>
            <input
              value={notifications.webhookUrl ?? ""}
              onChange={(e) => setNotifications({ ...notifications, webhookUrl: e.target.value || null })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Slack webhook URL</span>
            <input
              value={notifications.slackWebhookUrl ?? ""}
              onChange={(e) =>
                setNotifications({ ...notifications, slackWebhookUrl: e.target.value || null })
              }
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
          <label className="col-span-full block space-y-1 text-sm">
            <span>Email recipients (comma-separated)</span>
            <input
              value={notifications.emailRecipients ?? ""}
              onChange={(e) =>
                setNotifications({ ...notifications, emailRecipients: e.target.value || null })
              }
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
            />
          </label>
        </div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifications.notifyOnComplete ?? true}
              onChange={(e) =>
                setNotifications({ ...notifications, notifyOnComplete: e.target.checked })
              }
            />
            On complete
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifications.notifyOnFail ?? true}
              onChange={(e) => setNotifications({ ...notifications, notifyOnFail: e.target.checked })}
            />
            On fail
          </label>
        </div>
        <button
          disabled={savingNotifications}
          onClick={() => void saveNotifications()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {savingNotifications ? "Saving…" : "Save notifications"}
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Autonomous schedules</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Run workflows on an interval using consensus memory as initial context.
        </p>

        <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <input
            placeholder="Schedule name"
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
            title="Interval in seconds"
          />
          <button
            disabled={!scheduleForm.name.trim() || !scheduleForm.workflowId}
            onClick={() => void createSchedule()}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            Add schedule
          </button>
        </div>

        <ul className="space-y-2">
          {schedules.map((schedule) => (
            <li
              key={schedule.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
            >
              <div>
                <div className="font-medium">{schedule.name}</div>
                <div className="text-xs text-[var(--color-muted-foreground)]">
                  Every {schedule.intervalSec}s · {schedule.enabled ? "enabled" : "paused"}
                  {schedule.nextRunAt && ` · next ${new Date(schedule.nextRunAt).toLocaleString()}`}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void runScheduleNow(schedule.id)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm"
                >
                  Run now
                </button>
                <button
                  onClick={() => void toggleSchedule(schedule)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm"
                >
                  {schedule.enabled ? "Pause" : "Enable"}
                </button>
                <button
                  onClick={() => void deleteSchedule(schedule.id)}
                  className="rounded-lg border border-[var(--color-destructive)] px-3 py-1 text-sm text-[var(--color-destructive)]"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {schedules.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">No schedules yet.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
