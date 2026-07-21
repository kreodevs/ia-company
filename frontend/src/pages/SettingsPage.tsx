import { useEffect, useState } from "react";
import { api, type AutonomousSchedule, type TenantLlmConfig, type Workflow } from "../lib/api";

export default function SettingsPage() {
  const [llm, setLlm] = useState<Partial<TenantLlmConfig>>({});
  const [schedules, setSchedules] = useState<AutonomousSchedule[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLlm, setSavingLlm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ name: "", workflowId: "", intervalSec: 1800 });

  const load = async () => {
    setLoading(true);
    const [llmConfig, scheduleList, workflowList] = await Promise.all([
      api.tenantSettings.getLlm(),
      api.schedules.list(),
      api.workflows.list(),
    ]);
    setLlm(llmConfig);
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
