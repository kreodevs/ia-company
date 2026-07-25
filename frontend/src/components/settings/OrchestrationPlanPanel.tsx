import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  api,
  type AutonomousSchedule,
  type OrchestrationPresetSummary,
  type ScheduleConditions,
  type Workflow,
} from "../../lib/api";
import { translateApiError } from "../../lib/translate-error";
import { formatWorkflowTitle } from "../../lib/workflow-display";

const INTERVAL_PRESETS = [3600, 7200, 21600, 43200, 86400, 604800] as const;
const CRON_PRESETS = [
  { labelKey: "settings.orchestration.cron.saturday9", value: "0 9 * * 6" },
  { labelKey: "settings.orchestration.cron.monday9", value: "0 9 * * 1" },
  { labelKey: "settings.orchestration.cron.daily9", value: "0 9 * * *" },
] as const;

type TimingMode = "interval" | "cron";

interface RuleDraft {
  name: string;
  workflowId: string;
  timingMode: TimingMode;
  intervalSec: number;
  cronExpr: string;
  priority: number;
  enabled: boolean;
  conditions: ScheduleConditions;
}

const EMPTY_CONDITIONS: ScheduleConditions = {};

function workflowLabel(name: string | undefined, t: (key: string, options?: Record<string, unknown>) => string) {
  if (!name) return t("settings.orchestration.dynamicWorkflow");
  const translated = t(`workflowDisplay.titles.${name}`, { defaultValue: "" });
  return translated || formatWorkflowTitle(name);
}

function formatTiming(schedule: AutonomousSchedule, t: (key: string, options?: Record<string, unknown>) => string) {
  if (schedule.cronExpr) {
    return schedule.cronExpr;
  }
  if (schedule.intervalSec >= 86400 && schedule.intervalSec % 86400 === 0) {
    return t("settings.orchestration.everyDays", { days: schedule.intervalSec / 86400 });
  }
  if (schedule.intervalSec >= 3600 && schedule.intervalSec % 3600 === 0) {
    return t("settings.orchestration.everyHours", { hours: schedule.intervalSec / 3600 });
  }
  return t("settings.orchestration.everySeconds", { seconds: schedule.intervalSec });
}

function conditionsSummary(
  conditions: ScheduleConditions | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!conditions) return t("settings.orchestration.conditions.none");
  const parts: string[] = [];
  if (conditions.pipelineEmpty) parts.push(t("settings.orchestration.conditions.pipelineEmpty"));
  if (conditions.pipelineHasIdeas) parts.push(t("settings.orchestration.conditions.pipelineHasIdeas"));
  if (conditions.hasPendingIdea) parts.push(t("settings.orchestration.conditions.hasPendingIdea"));
  if (conditions.hasBuildingProduct) parts.push(t("settings.orchestration.conditions.hasBuildingProduct"));
  if (conditions.hasGrowingProduct) parts.push(t("settings.orchestration.conditions.hasGrowingProduct"));
  if (conditions.noPendingDecisions) parts.push(t("settings.orchestration.conditions.noPendingDecisions"));
  if (conditions.phases?.length) {
    parts.push(t("settings.orchestration.conditions.phases", { phases: conditions.phases.join(", ") }));
  }
  return parts.length > 0 ? parts.join(" · ") : t("settings.orchestration.conditions.none");
}

export interface OrchestrationPlanPanelProps {
  schedules: AutonomousSchedule[];
  workflows: Workflow[];
  onRefresh: () => void | Promise<void>;
}

export default function OrchestrationPlanPanel({
  schedules,
  workflows,
  onRefresh,
}: OrchestrationPlanPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [presets, setPresets] = useState<OrchestrationPresetSummary[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<RuleDraft>>>({});
  const [newRule, setNewRule] = useState<RuleDraft>({
    name: "",
    workflowId: workflows[0]?.id ?? "",
    timingMode: "interval",
    intervalSec: 604800,
    cronExpr: "0 9 * * 6",
    priority: 10,
    enabled: true,
    conditions: { pipelineEmpty: true },
  });

  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name)),
    [schedules],
  );

  const workflowNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const workflow of workflows) map.set(workflow.id, workflow.name);
    return map;
  }, [workflows]);

  const loadPresets = async () => {
    const items = await api.schedules.presets();
    setPresets(items);
  };

  useEffect(() => {
    void loadPresets();
  }, []);

  const applyPreset = async (presetId: string) => {
    if (!confirm(t("settings.orchestration.applyPresetConfirm"))) return;
    setBusyId("preset");
    setError(null);
    try {
      await api.schedules.applyPreset(presetId);
      await onRefresh();
    } catch (err) {
      setError(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const saveRule = async (schedule: AutonomousSchedule) => {
    const draft = drafts[schedule.id];
    if (!draft) return;

    setBusyId(schedule.id);
    setError(null);
    try {
      await api.schedules.update(schedule.id, {
        name: draft.name ?? schedule.name,
        workflowId: draft.workflowId ?? schedule.workflowId,
        priority: draft.priority ?? schedule.priority,
        enabled: draft.enabled ?? schedule.enabled,
        intervalSec: draft.timingMode === "interval" ? draft.intervalSec ?? schedule.intervalSec : schedule.intervalSec,
        cronExpr:
          draft.timingMode === "cron"
            ? draft.cronExpr ?? schedule.cronExpr
            : null,
        conditions: draft.conditions ?? schedule.conditions,
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[schedule.id];
        return next;
      });
      await onRefresh();
    } catch (err) {
      setError(translateApiError(err, t, "common.saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const createRule = async () => {
    if (!newRule.name.trim()) return;
    setBusyId("create");
    setError(null);
    try {
      await api.schedules.create({
        name: newRule.name.trim(),
        orchestrationMode: "fixed",
        workflowId: newRule.workflowId,
        intervalSec: newRule.timingMode === "interval" ? newRule.intervalSec : 604800,
        cronExpr: newRule.timingMode === "cron" ? newRule.cronExpr : null,
        priority: newRule.priority,
        enabled: newRule.enabled,
        conditions: Object.keys(newRule.conditions).length > 0 ? newRule.conditions : null,
      });
      setNewRule({
        name: "",
        workflowId: workflows[0]?.id ?? "",
        timingMode: "interval",
        intervalSec: 604800,
        cronExpr: "0 9 * * 6",
        priority: 10,
        enabled: true,
        conditions: { pipelineEmpty: true },
      });
      await onRefresh();
    } catch (err) {
      setError(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const toggleRule = async (schedule: AutonomousSchedule) => {
    setBusyId(schedule.id);
    setError(null);
    try {
      await api.schedules.update(schedule.id, { enabled: !schedule.enabled });
      await onRefresh();
    } catch (err) {
      setError(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm(t("settings.orchestration.deleteConfirm"))) return;
    setBusyId(id);
    setError(null);
    try {
      await api.schedules.delete(id);
      await onRefresh();
    } catch (err) {
      setError(translateApiError(err, t, "common.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const runNow = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const { runId } = await api.schedules.runNow(id);
      navigate(`/runs/${runId}`);
    } catch (err) {
      setError(translateApiError(err, t, "settings.metaSchedule.runFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const getDraft = (schedule: AutonomousSchedule): RuleDraft => {
    const draft = drafts[schedule.id];
    return {
      name: draft?.name ?? schedule.name,
      workflowId: draft?.workflowId ?? schedule.workflowId ?? workflows[0]?.id ?? "",
      timingMode: draft?.timingMode ?? (schedule.cronExpr ? "cron" : "interval"),
      intervalSec: draft?.intervalSec ?? schedule.intervalSec,
      cronExpr: draft?.cronExpr ?? schedule.cronExpr ?? "0 9 * * 6",
      priority: draft?.priority ?? schedule.priority,
      enabled: draft?.enabled ?? schedule.enabled,
      conditions: draft?.conditions ?? schedule.conditions ?? EMPTY_CONDITIONS,
    };
  };

  const patchDraft = (scheduleId: string, patch: Partial<RuleDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [scheduleId]: { ...prev[scheduleId], ...patch },
    }));
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t("settings.orchestration.title")}</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">{t("settings.orchestration.subtitle")}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {(presets.length > 0 ? presets : [
            { id: "on_demand", labelKey: "settings.orchestration.presets.onDemand.label", descriptionKey: "settings.orchestration.presets.onDemand.description", ruleCount: 0 },
            { id: "discovery_only", labelKey: "settings.orchestration.presets.discoveryOnly.label", descriptionKey: "settings.orchestration.presets.discoveryOnly.description", ruleCount: 1 },
            { id: "light_exploration", labelKey: "settings.orchestration.presets.lightExploration.label", descriptionKey: "settings.orchestration.presets.lightExploration.description", ruleCount: 3 },
          ]).map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={busyId === "preset"}
              onClick={() => void applyPreset(preset.id)}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left hover:border-[var(--color-primary)]"
            >
              <p className="font-medium">{t(preset.labelKey)}</p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t(preset.descriptionKey)}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-[var(--color-primary)]">
                {t("settings.orchestration.presetRules", { count: preset.ruleCount })}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold">{t("settings.orchestration.rulesTitle")}</h3>
        {sortedSchedules.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">{t("settings.orchestration.empty")}</p>
        ) : (
          <ul className="space-y-4">
            {sortedSchedules.map((schedule) => {
              const draft = getDraft(schedule);
              const isLegacyMeta = schedule.orchestrationMode === "meta_dynamic";
              const workflowName = draft.workflowId ? workflowNameById.get(draft.workflowId) : undefined;
              const isBusy = busyId === schedule.id;

              return (
                <li
                  key={schedule.id}
                  className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{schedule.name}</p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {isLegacyMeta
                          ? t("settings.orchestration.dynamicDescription")
                          : t("settings.orchestration.fixedDescription", {
                              workflow: workflowLabel(workflowName, t),
                            })}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {formatTiming(schedule, t)} · {t("settings.orchestration.priorityLabel", { value: schedule.priority })} ·{" "}
                        {schedule.enabled ? t("common.enabled") : t("common.paused")}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {t("settings.orchestration.conditionsLabel")}: {conditionsSummary(schedule.conditions, t)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void runNow(schedule.id)}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
                      >
                        {t("common.runNow")}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void toggleRule(schedule)}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
                      >
                        {schedule.enabled ? t("common.pause") : t("common.enable")}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void deleteRule(schedule.id)}
                        className="rounded-lg border border-[var(--color-destructive)]/30 px-3 py-1.5 text-sm text-[var(--color-destructive)]"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block space-y-1 text-sm">
                      <span>{t("settings.orchestration.nameLabel")}</span>
                      <input
                        value={draft.name}
                        onChange={(e) => patchDraft(schedule.id, { name: e.target.value })}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                      />
                    </label>
                    {!isLegacyMeta ? (
                      <label className="block space-y-1 text-sm">
                        <span>{t("settings.orchestration.workflowLabel")}</span>
                        <select
                          value={draft.workflowId}
                          onChange={(e) => patchDraft(schedule.id, { workflowId: e.target.value })}
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                        >
                          {workflows.map((workflow) => (
                            <option key={workflow.id} value={workflow.id}>
                              {workflowLabel(workflow.name, t)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <p className="md:col-span-2 text-sm text-[var(--color-muted-foreground)]">
                        {t("settings.orchestration.dynamicModeHint")}{" "}
                        <Link to="/office" className="text-[var(--color-primary)] hover:underline">
                          {t("office.title")}
                        </Link>
                      </p>
                    )}
                    <label className="block space-y-1 text-sm">
                      <span>{t("settings.orchestration.priorityLabel", { value: "" }).replace(/\s*$/, "")}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draft.priority}
                        onChange={(e) => patchDraft(schedule.id, { priority: Number(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span>{t("settings.orchestration.timingModeLabel")}</span>
                      <select
                        value={draft.timingMode}
                        onChange={(e) => patchDraft(schedule.id, { timingMode: e.target.value as TimingMode })}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                      >
                        <option value="interval">{t("settings.orchestration.timingInterval")}</option>
                        <option value="cron">{t("settings.orchestration.timingCron")}</option>
                      </select>
                    </label>
                    {draft.timingMode === "interval" ? (
                      <label className="block space-y-1 text-sm">
                        <span>{t("settings.orchestration.intervalLabel")}</span>
                        <select
                          value={String(draft.intervalSec)}
                          onChange={(e) => patchDraft(schedule.id, { intervalSec: Number(e.target.value) })}
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                        >
                          {INTERVAL_PRESETS.map((value) => (
                            <option key={value} value={value}>
                              {formatTiming({ ...schedule, cronExpr: null, intervalSec: value }, t)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label className="block space-y-1 text-sm md:col-span-2">
                        <span>{t("settings.orchestration.cronLabel")}</span>
                        <input
                          value={draft.cronExpr}
                          onChange={(e) => patchDraft(schedule.id, { cronExpr: e.target.value })}
                          placeholder="0 9 * * 6"
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-sm"
                        />
                      </label>
                    )}
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">{t("settings.orchestration.conditions.title")}</legend>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {(
                        [
                          ["pipelineEmpty", t("settings.orchestration.conditions.pipelineEmpty")],
                          ["pipelineHasIdeas", t("settings.orchestration.conditions.pipelineHasIdeas")],
                          ["hasPendingIdea", t("settings.orchestration.conditions.hasPendingIdea")],
                          ["hasBuildingProduct", t("settings.orchestration.conditions.hasBuildingProduct")],
                          ["hasGrowingProduct", t("settings.orchestration.conditions.hasGrowingProduct")],
                          ["noPendingDecisions", t("settings.orchestration.conditions.noPendingDecisions")],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(draft.conditions[key])}
                            onChange={(e) =>
                              patchDraft(schedule.id, {
                                conditions: {
                                  ...draft.conditions,
                                  [key]: e.target.checked || undefined,
                                },
                              })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {drafts[schedule.id] ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void saveRule(schedule)}
                      className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
                    >
                      {isBusy ? t("common.saving") : t("common.save")}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h3 className="font-semibold">{t("settings.orchestration.addRuleTitle")}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            placeholder={t("settings.orchestration.namePlaceholder")}
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          />
          <select
            value={newRule.workflowId}
            onChange={(e) => setNewRule({ ...newRule, workflowId: e.target.value })}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          >
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflowLabel(workflow.name, t)}
              </option>
            ))}
          </select>
          <select
            value={newRule.timingMode}
            onChange={(e) => setNewRule({ ...newRule, timingMode: e.target.value as TimingMode })}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          >
            <option value="interval">{t("settings.orchestration.timingInterval")}</option>
            <option value="cron">{t("settings.orchestration.timingCron")}</option>
          </select>
          {newRule.timingMode === "interval" ? (
            <select
              value={String(newRule.intervalSec)}
              onChange={(e) => setNewRule({ ...newRule, intervalSec: Number(e.target.value) })}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            >
              {INTERVAL_PRESETS.map((value) => (
                <option key={value} value={value}>
                  {t("settings.orchestration.everySeconds", { seconds: value })}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={newRule.cronExpr}
              onChange={(e) => setNewRule({ ...newRule, cronExpr: e.target.value })}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            >
              {CRON_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {t(preset.labelKey)}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="button"
          disabled={busyId === "create" || !newRule.name.trim()}
          onClick={() => void createRule()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {busyId === "create" ? t("common.saving") : t("settings.orchestration.addRule")}
        </button>
      </section>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {t("settings.orchestration.footer")}{" "}
        <Link to="/ops" className="text-[var(--color-primary)] hover:underline">
          {t("ops.title")}
        </Link>
      </p>

      {error ? (
        <p className="text-sm text-[var(--color-destructive)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
