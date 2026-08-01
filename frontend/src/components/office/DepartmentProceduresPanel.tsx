import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, GitBranch, Link2, Play, Plus, Settings2 } from "lucide-react";
import {
  api,
  type OfficeProcedureSummary,
  type OfficeScheduledProcedureSummary,
  type Workflow,
} from "../../lib/api";
import { agentDisplayLabel } from "../../lib/office-visual";
import { formatWorkflowTitle } from "../../lib/workflow-display";
import { translateApiError } from "../../lib/translate-error";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import StatusPill from "../ui/StatusPill";
import { Dialog } from "../molecules/Dialog";
import { toast } from "../molecules/Sonner";

export interface DepartmentProcedureSelection {
  workflowId: string;
  serviceId: string | null;
  prompt: string;
}

interface DepartmentProceduresPanelProps {
  departmentSlug?: string;
  orgUnitId?: string;
  onUseProcedure: (selection: DepartmentProcedureSelection) => void;
}

function serviceIdToI18nKey(serviceId: string): string {
  return serviceId.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function examplePromptForProcedure(
  procedure: OfficeProcedureSummary,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (procedure.serviceId) {
    const key = `office.serviceTemplates.${serviceIdToI18nKey(procedure.serviceId)}.example`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return t("office.procedures.defaultPrompt", { name: procedure.procedureLabel });
}

function formatScheduleInstant(
  iso: string | null | undefined,
  timeZone: string,
  locale?: string,
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatScheduledTiming(
  schedule: OfficeScheduledProcedureSummary,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (schedule.cronExpr) {
    return t("office.procedures.scheduledCron", { expr: schedule.cronExpr });
  }
  if (schedule.intervalSec >= 86400 && schedule.intervalSec % 86400 === 0) {
    return t("office.procedures.scheduledEveryDays", {
      days: schedule.intervalSec / 86400,
    });
  }
  if (schedule.intervalSec >= 3600 && schedule.intervalSec % 3600 === 0) {
    return t("office.procedures.scheduledEveryHours", {
      hours: schedule.intervalSec / 3600,
    });
  }
  return t("office.procedures.scheduledEverySeconds", {
    seconds: schedule.intervalSec,
  });
}

function translateSkipReason(
  reason: string | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  if (!reason) return null;
  const keyByReason: Record<string, string> = {
    "Pipeline is not empty": "settings.orchestration.skipReasons.pipelineNotEmpty",
    "Pipeline has no ideas": "settings.orchestration.skipReasons.pipelineHasNoIdeas",
    "No building/launching product": "settings.orchestration.skipReasons.noBuildingProduct",
    "No growing product": "settings.orchestration.skipReasons.noGrowingProduct",
    "No pending idea to evaluate": "settings.orchestration.skipReasons.noPendingIdea",
    "Human decisions pending": "settings.orchestration.skipReasons.pendingDecisions",
    "Department has no linked work items": "settings.orchestration.skipReasons.noOrgUnitWork",
    "Active run in progress": "settings.orchestration.skipReasons.activeRun",
    "Conditions not met": "settings.orchestration.skipReasons.conditionsNotMet",
  };
  const key = keyByReason[reason];
  return key ? t(key) : reason;
}

export default function DepartmentProceduresPanel({
  departmentSlug,
  orgUnitId,
  onUseProcedure,
}: DepartmentProceduresPanelProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<OfficeProcedureSummary[]>([]);
  const [scheduled, setScheduled] = useState<OfficeScheduledProcedureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(false);
  const [allWorkflows, setAllWorkflows] = useState<Workflow[]>([]);
  const [linkWorkflowId, setLinkWorkflowId] = useState("");

  const loadProcedures = useCallback(async () => {
    setLoading(true);
    try {
      const response = departmentSlug
        ? await api.office.departmentProcedures(departmentSlug)
        : orgUnitId
          ? await api.orgUnits.procedures(orgUnitId)
          : { items: [], scheduled: [] };
      setItems(response.items);
      setScheduled(response.scheduled ?? []);
    } catch {
      setItems([]);
      setScheduled([]);
    } finally {
      setLoading(false);
    }
  }, [departmentSlug, orgUnitId]);

  useEffect(() => {
    void loadProcedures();
  }, [loadProcedures]);

  const linkedIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);

  const linkableWorkflows = useMemo(
    () =>
      allWorkflows
        .filter((workflow) => !linkedIds.has(workflow.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allWorkflows, linkedIds],
  );

  const openLinkModal = async () => {
    setLinkOpen(true);
    setLinkWorkflowId("");
    try {
      const workflows = await api.workflows.list();
      setAllWorkflows(workflows);
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    }
  };

  const createProcedure = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const procedure = departmentSlug
        ? await api.office.createDepartmentProcedure(departmentSlug, { name })
        : orgUnitId
          ? await api.orgUnits.createProcedure(orgUnitId, { name })
          : null;
      if (!procedure) return;
      setCreateOpen(false);
      setNewName("");
      toast.success(t("office.procedures.createSubmit"));
      await navigate(`/office/workflows/${procedure.id}`);
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setCreating(false);
    }
  };

  const linkProcedure = async () => {
    if (!linkWorkflowId) return;
    setLinking(true);
    try {
      if (departmentSlug) {
        await api.office.linkDepartmentProcedure(departmentSlug, linkWorkflowId);
      } else if (orgUnitId) {
        await api.orgUnits.linkProcedure(orgUnitId, linkWorkflowId);
      }
      setLinkOpen(false);
      setLinkWorkflowId("");
      toast.success(t("office.procedures.linkSubmit"));
      await loadProcedures();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.requestFailed"));
    } finally {
      setLinking(false);
    }
  };

  const procedureActions = (
    <div className="office-dept-procedure-actions office-dept-procedures-toolbar">
      <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
        {t("office.procedures.create")}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => void openLinkModal()}>
        <Link2 className="mr-1 h-3.5 w-3.5" aria-hidden />
        {t("office.procedures.linkExisting")}
      </Button>
      <Link to="/settings/procedures" className="office-link-btn office-link-btn-muted">
        {t("office.procedures.manageAll")}
      </Link>
    </div>
  );

  return (
    <>
      <section className="office-panel office-dept-procedures">
        <div className="office-dept-procedures-head office-dept-procedures-head--with-actions">
          <div>
            <h2 className="office-panel-title">{t("office.procedures.title")}</h2>
            <p className="office-dept-procedures-subtitle">{t("office.procedures.subtitle")}</p>
          </div>
          {procedureActions}
        </div>

        {loading ? (
          <p className="office-empty">{t("office.procedures.loading")}</p>
        ) : items.length === 0 ? (
          <div className="office-dept-procedures-empty">
            <p className="office-empty">{t("office.procedures.empty")}</p>
            <p className="office-dept-procedures-subtitle">{t("office.procedures.emptyHint")}</p>
          </div>
        ) : (
          <ul className="office-dept-procedures-list">
            {items.map((procedure) => (
              <li key={procedure.id} className="office-dept-procedure-card">
                <div className="office-dept-procedure-main">
                  <h3 className="office-dept-procedure-title">{procedure.procedureLabel}</h3>
                  {procedure.description ? (
                    <p className="office-dept-procedure-desc">{procedure.description}</p>
                  ) : null}
                  {procedure.agentNames.length > 0 ? (
                    <p className="office-dept-procedure-agents">
                      {procedure.agentNames
                        .map((name) => agentDisplayLabel({ name, role: null }, t))
                        .join(" → ")}
                    </p>
                  ) : null}
                  <p className="office-dept-procedure-meta">
                    {t("office.procedures.stepCount", { count: procedure.stepCount })}
                  </p>
                </div>
                <div className="office-dept-procedure-actions">
                  <Button
                    size="sm"
                    onClick={() =>
                      onUseProcedure({
                        workflowId: procedure.id,
                        serviceId: procedure.serviceId,
                        prompt: examplePromptForProcedure(procedure, t),
                      })
                    }
                  >
                    <Play className="mr-1 h-3.5 w-3.5" aria-hidden />
                    {t("office.procedures.use")}
                  </Button>
                  <Link
                    to={`/office/workflows/${procedure.id}`}
                    className="office-link-btn office-link-btn-muted"
                  >
                    <GitBranch className="h-3.5 w-3.5" aria-hidden />
                    {t("office.procedures.view")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        visible={createOpen}
        onHide={() => setCreateOpen(false)}
        title={t("office.procedures.createTitle")}
        description={t("office.procedures.createHint")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={creating || !newName.trim()} onClick={() => void createProcedure()}>
              {creating ? t("common.creating") : t("office.procedures.createSubmit")}
            </Button>
          </div>
        }
      >
        <Input
          label={t("office.procedures.namePlaceholder")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("office.procedures.namePlaceholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") void createProcedure();
          }}
        />
      </Dialog>

      <Dialog
        visible={linkOpen}
        onHide={() => setLinkOpen(false)}
        title={t("office.procedures.linkTitle")}
        description={t("office.procedures.linkHint")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLinkOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={linking || !linkWorkflowId}
              onClick={() => void linkProcedure()}
            >
              {linking ? t("common.saving") : t("office.procedures.linkSubmit")}
            </Button>
          </div>
        }
      >
        {linkableWorkflows.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t("office.procedures.settingsEmptySubtitle")}
          </p>
        ) : (
          <Select
            value={linkWorkflowId}
            onChange={setLinkWorkflowId}
            ariaLabel={t("office.procedures.linkSelect")}
            options={[
              { value: "", label: t("office.procedures.linkSelectPlaceholder") },
              ...linkableWorkflows.map((workflow) => ({
                value: workflow.id,
                label: formatWorkflowTitle(workflow.name),
              })),
            ]}
          />
        )}
      </Dialog>

      <section className="office-panel office-dept-procedures office-dept-scheduled-procedures">
        <div className="office-dept-procedures-head">
          <h2 className="office-panel-title">{t("office.procedures.scheduledTitle")}</h2>
          <p className="office-dept-procedures-subtitle">
            {t("office.procedures.scheduledSubtitle")}
          </p>
        </div>

        {loading ? (
          <p className="office-empty">{t("office.procedures.scheduledLoading")}</p>
        ) : scheduled.length === 0 ? (
          <p className="office-empty">{t("office.procedures.scheduledEmpty")}</p>
        ) : (
          <ul className="office-dept-procedures-list">
            {scheduled.map((entry) => {
              const nextRunLabel =
                entry.enabled && entry.nextRunAt
                  ? formatScheduleInstant(entry.nextRunAt, entry.tenantTimezone, i18n.language)
                  : null;
              const lastRunLabel = entry.lastRunAt
                ? formatScheduleInstant(entry.lastRunAt, entry.tenantTimezone, i18n.language)
                : null;
              const skipReason = translateSkipReason(entry.currentSkipReason, t);

              return (
                <li
                  key={entry.scheduleId}
                  className="office-dept-procedure-card office-dept-procedure-card--scheduled"
                >
                  <div className="office-dept-procedure-main">
                    <div className="office-dept-scheduled-title-row">
                      <h3 className="office-dept-procedure-title">{entry.scheduleName}</h3>
                      {!entry.enabled ? (
                        <StatusPill status="paused">
                          {t("office.procedures.scheduledDisabled")}
                        </StatusPill>
                      ) : entry.conditionsMet ? (
                        <StatusPill status="completed">OK</StatusPill>
                      ) : (
                        <StatusPill status="waiting">
                          {skipReason ??
                            t("office.procedures.scheduledWaiting", { reason: "…" })}
                        </StatusPill>
                      )}
                    </div>
                    <p className="office-dept-procedure-desc">
                      {entry.procedureLabel ??
                        (entry.orchestrationMode === "meta_dynamic"
                          ? t("office.procedures.scheduledMetaDynamic")
                          : entry.workflowName ?? "—")}
                    </p>
                    <p className="office-dept-procedure-meta">
                      <CalendarClock className="office-dept-scheduled-icon" aria-hidden />
                      {formatScheduledTiming(entry, t)}
                    </p>
                    {nextRunLabel ? (
                      <p className="office-dept-procedure-meta">
                        {t("office.procedures.scheduledNextRun", { when: nextRunLabel })}
                      </p>
                    ) : null}
                    {lastRunLabel ? (
                      <p className="office-dept-procedure-meta">
                        {t("office.procedures.scheduledLastRun", { when: lastRunLabel })}
                      </p>
                    ) : null}
                    {entry.enabled && !entry.conditionsMet && skipReason ? (
                      <p className="office-dept-procedure-meta office-dept-scheduled-waiting">
                        {t("office.procedures.scheduledWaiting", { reason: skipReason })}
                      </p>
                    ) : null}
                  </div>
                  <div className="office-dept-procedure-actions">
                    <Link
                      to="/settings?tab=schedules"
                      className="office-link-btn office-link-btn-muted"
                    >
                      <Settings2 className="h-3.5 w-3.5" aria-hidden />
                      {t("office.procedures.scheduledConfigure")}
                    </Link>
                    <Link to="/ops" className="office-link-btn office-link-btn-muted">
                      {t("office.procedures.scheduledViewOps")}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
