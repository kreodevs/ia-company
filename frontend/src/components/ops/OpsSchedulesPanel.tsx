import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, Play, Trash2 } from "lucide-react";
import { api, type AutonomousSchedule, type Workflow } from "../../lib/api";
import { translateApiError } from "../../lib/translate-error";
import { formatWorkflowTitle } from "../../lib/workflow-display";
import { toast } from "../molecules/Sonner";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import Select from "../ui/Select";
import StatusPill from "../ui/StatusPill";
import ConfirmDialog from "../ui/ConfirmDialog";
import EmptyState from "../ui/EmptyState";

const INTERVAL_PRESETS = [900, 1800, 3600, 7200, 21600, 43200, 86400] as const;

function workflowLabel(name: string | undefined, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!name) return t("ops.schedules.dynamicWorkflow");
  const translated = t(`workflowDisplay.titles.${name}`, { defaultValue: "" });
  return translated || formatWorkflowTitle(name);
}

function formatInterval(seconds: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (seconds < 3600) {
    return t("ops.schedules.intervalMinutes", { minutes: Math.round(seconds / 60) });
  }
  if (seconds % 3600 === 0) {
    return t("ops.schedules.intervalHours", { hours: seconds / 3600 });
  }
  return t("ops.schedules.intervalSeconds", { seconds });
}

export interface OpsSchedulesPanelProps {
  schedules: AutonomousSchedule[];
  onRefresh: () => void | Promise<void>;
}

export default function OpsSchedulesPanel({ schedules, onRefresh }: OpsSchedulesPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [draftIntervals, setDraftIntervals] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void api.workflows.list().then(setWorkflows).catch(() => undefined);
  }, []);

  useEffect(() => {
    setDraftIntervals((prev) => {
      const next = { ...prev };
      for (const schedule of schedules) {
        if (next[schedule.id] === undefined) {
          next[schedule.id] = schedule.intervalSec;
        }
      }
      return next;
    });
  }, [schedules]);

  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort((a, b) => {
        if (a.scheduleKind === "meta" && b.scheduleKind !== "meta") return -1;
        if (b.scheduleKind === "meta" && a.scheduleKind !== "meta") return 1;
        return a.name.localeCompare(b.name);
      }),
    [schedules],
  );

  const workflowNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const workflow of workflows) {
      map.set(workflow.id, workflow.name);
    }
    return map;
  }, [workflows]);

  const intervalOptions = (current: number) => {
    const values = new Set<number>([...INTERVAL_PRESETS, current]);
    return [...values]
      .sort((a, b) => a - b)
      .map((value) => ({
        value: String(value),
        label: formatInterval(value, t),
      }));
  };

  const saveInterval = async (schedule: AutonomousSchedule) => {
    const intervalSec = draftIntervals[schedule.id] ?? schedule.intervalSec;
    if (intervalSec < 60) {
      toast.error(t("ops.schedules.minInterval"));
      return;
    }
    if (intervalSec === schedule.intervalSec) return;

    setBusyId(schedule.id);
    try {
      await api.schedules.update(schedule.id, { intervalSec });
      toast.success(t("ops.schedules.intervalSaved"));
      await onRefresh();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const toggleEnabled = async (schedule: AutonomousSchedule) => {
    setBusyId(schedule.id);
    try {
      await api.schedules.update(schedule.id, { enabled: !schedule.enabled });
      toast.success(
        schedule.enabled ? t("ops.schedules.paused") : t("ops.schedules.resumed"),
      );
      await onRefresh();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const runNow = async (schedule: AutonomousSchedule) => {
    setBusyId(schedule.id);
    try {
      const { runId } = await api.schedules.runNow(schedule.id);
      toast.success(t("ops.schedules.runStarted"));
      await onRefresh();
      if (runId) navigate(`/runs/${runId}`);
    } catch (err) {
      toast.error(translateApiError(err, t, "settings.metaSchedule.runFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setBusyId(deleteId);
    try {
      await api.schedules.delete(deleteId);
      toast.success(t("ops.schedules.cancelled"));
      setDeleteId(null);
      await onRefresh();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const deleteTarget = schedules.find((schedule) => schedule.id === deleteId);

  return (
    <>
      <Panel
        title={t("ops.schedules.title")}
        subtitle={t("ops.schedules.subtitle")}
        actions={
          <Link
            to="/settings?tab=schedules"
            className="interactive text-xs text-[var(--color-primary)] hover:underline"
          >
            {t("ops.schedules.advanced")}
          </Link>
        }
        bodySize="sm"
      >
        {sortedSchedules.length === 0 ? (
          <EmptyState
            title={t("ops.schedules.emptyTitle")}
            description={t("ops.schedules.emptyHint")}
            action={
              <Button
                variant="secondary"
                onClick={() =>
                  void api.schedules.ensureMeta().then(() => onRefresh())
                }
              >
                {t("ops.metaCycle.enableSchedule")}
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {sortedSchedules.map((schedule) => {
              const isMeta = schedule.scheduleKind === "meta";
              const workflowName = schedule.workflowId
                ? workflowNameById.get(schedule.workflowId)
                : undefined;
              const draftInterval = draftIntervals[schedule.id] ?? schedule.intervalSec;
              const intervalDirty = draftInterval !== schedule.intervalSec;
              const isBusy = busyId === schedule.id;

              return (
                <li key={schedule.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
                        <span className="font-medium">{schedule.name}</span>
                        <StatusPill status={schedule.enabled ? "running" : "paused"} />
                        {isMeta ? (
                          <span className="rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                            {t("ops.schedules.metaBadge")}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {isMeta
                          ? t("ops.schedules.metaDescription")
                          : t("ops.schedules.workflowDescription", {
                              workflow: workflowLabel(workflowName, t),
                            })}
                      </p>
                      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
                        <div>
                          <dt className="inline font-medium">{t("ops.schedules.every")}: </dt>
                          <dd className="inline">{formatInterval(schedule.intervalSec, t)}</dd>
                        </div>
                        {schedule.nextRunAt && schedule.enabled ? (
                          <div>
                            <dt className="inline font-medium">{t("ops.schedules.nextRun")}: </dt>
                            <dd className="inline">{new Date(schedule.nextRunAt).toLocaleString()}</dd>
                          </div>
                        ) : null}
                        {schedule.lastRunAt ? (
                          <div>
                            <dt className="inline font-medium">{t("ops.schedules.lastRun")}: </dt>
                            <dd className="inline">{new Date(schedule.lastRunAt).toLocaleString()}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>

                    <div className="flex w-full min-w-[16rem] max-w-md flex-col gap-2 sm:w-auto">
                      <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                        {t("ops.schedules.intervalLabel")}
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={String(draftInterval)}
                          onChange={(value) =>
                            setDraftIntervals((prev) => ({
                              ...prev,
                              [schedule.id]: Number(value),
                            }))
                          }
                          options={intervalOptions(schedule.intervalSec)}
                          ariaLabel={t("ops.schedules.intervalLabel")}
                          className="min-w-[10rem] flex-1"
                          size="sm"
                        />
                        {intervalDirty ? (
                          <Button
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void saveInterval(schedule)}
                          >
                            {isBusy ? t("common.saving") : t("common.save")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void runNow(schedule)}
                    >
                      <Play className="mr-1 h-3.5 w-3.5" aria-hidden />
                      {isBusy ? t("common.starting") : t("common.runNow")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void toggleEnabled(schedule)}
                    >
                      {schedule.enabled ? t("common.pause") : t("common.enable")}
                    </Button>
                    {!isMeta ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[var(--color-destructive)]"
                        disabled={isBusy}
                        onClick={() => setDeleteId(schedule.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                        {t("ops.schedules.cancel")}
                      </Button>
                    ) : (
                      <span className="self-center text-xs text-[var(--color-muted-foreground)]">
                        {t("ops.schedules.metaNoDelete")}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={deleteId !== null}
        title={t("ops.schedules.cancelTitle", { name: deleteTarget?.name ?? "" })}
        description={t("ops.schedules.cancelDescription")}
        confirmLabel={t("ops.schedules.cancelConfirm")}
        destructive
        busy={busyId === deleteId}
        onCancel={() => (busyId ? undefined : setDeleteId(null))}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
