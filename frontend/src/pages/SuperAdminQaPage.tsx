import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, Play, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TenantImpersonationSelect from "../components/TenantImpersonationSelect";
import {
  api,
  type ManualQaStep,
  type ManualQaStepWithAuto,
  type PlatformQaReport,
  type QaCheckResult,
} from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageFrame from "../components/ui/PageFrame";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import StatusPill from "../components/ui/StatusPill";
import EmptyState from "../components/ui/EmptyState";
import { DataTable, type DataTableColumn } from "../components/organisms/DataTable";
import { translateApiError } from "../lib/translate-error";

function statusPill(status: QaCheckResult["status"]) {
  switch (status) {
    case "pass":
      return "completed";
    case "fail":
      return "cancelled";
    case "warn":
      return "running";
    default:
      return "pending";
  }
}

function autoStatusPill(status: ManualQaStepWithAuto["autoStatus"]) {
  switch (status) {
    case "pass":
      return "completed";
    case "fail":
      return "cancelled";
    case "warn":
      return "running";
    case "skip":
      return "pending";
    default:
      return "pending";
  }
}

function storageKey(tenantId: string | null) {
  return `platform-qa-manual-v1:${tenantId ?? "platform"}`;
}

function loadDoneIds(tenantId: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveDoneIds(tenantId: string | null, ids: Set<string>) {
  localStorage.setItem(storageKey(tenantId), JSON.stringify([...ids]));
}

/**
 * QA automatizada + checklist manual paperclip (prod / contenedor).
 */
export default function SuperAdminQaPage() {
  const { t } = useTranslation();
  const { activeTenant } = useAuth();
  const tenantKey = activeTenant?.id ?? null;
  const [report, setReport] = useState<PlatformQaReport | null>(null);
  const [checklistSteps, setChecklistSteps] = useState<ManualQaStep[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(() => loadDoneIds(tenantKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.admin.qaChecklist().then((r) => setChecklistSteps(r.steps)).catch(() => {});
  }, []);

  useEffect(() => {
    setDoneIds(loadDoneIds(tenantKey));
  }, [tenantKey]);

  const manualRows: ManualQaStepWithAuto[] = useMemo(() => {
    if (report?.manualChecklist?.length) return report.manualChecklist;
    return checklistSteps.map((step) => ({ ...step, autoStatus: "manual" as const }));
  }, [report, checklistSteps]);

  const toggleDone = useCallback(
    (id: string) => {
      setDoneIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        saveDoneIds(tenantKey, next);
        return next;
      });
    },
    [tenantKey],
  );

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.admin.runPlatformQa(activeTenant?.id ?? null);
      setReport(result);
    } catch (e) {
      setError(translateApiError(e, t, "admin.qa.runFailed"));
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const columns: DataTableColumn[] = [
    { field: "category", header: "Ámbito", sortable: true },
    { field: "name", header: "Check", sortable: true },
    {
      field: "status",
      header: "Estado",
      body: (row: QaCheckResult) => <StatusPill status={statusPill(row.status)}>{row.status}</StatusPill>,
    },
    { field: "message", header: "Detalle" },
    {
      field: "durationMs",
      header: "ms",
      body: (row: QaCheckResult) => <span className="tabular-nums">{row.durationMs}</span>,
    },
  ];

  const manualDone = manualRows.filter((r) => doneIds.has(r.id)).length;

  return (
    <PageFrame width="wide">
      <PageHeader
        variant="command"
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("nav.admin"), to: "/admin" },
              { label: t("admin.qa.title") },
            ]}
          />
        }
        title={t("admin.qa.title")}
        subtitle={t("admin.qa.subtitle")}
        actions={
          <>
            <TenantImpersonationSelect />
            <Button type="button" disabled={loading} onClick={() => void run()}>
              {loading ? (
                <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Play className="mr-1.5 h-4 w-4" aria-hidden />
              )}
              {t("admin.qa.run")}
            </Button>
          </>
        }
      />

      <div className="app-alert app-alert--info text-sm" role="note">
        {t("admin.qa.prodRunbook")}
      </div>

      {!activeTenant && (
        <div className="app-alert app-alert--info" role="status">
          {t("admin.qa.needTenant")}
        </div>
      )}

      {error ? <EmptyState title={t("admin.qa.errorTitle")} description={error} /> : null}

      {report && (
        <Panel
          title={t("admin.qa.resultsTitle")}
          subtitle={
            report.tenantName
              ? `${report.tenantName} · ${new Date(report.ranAt).toLocaleString()}`
              : new Date(report.ranAt).toLocaleString()
          }
        >
          <p className="mb-4 text-sm text-[var(--foreground-muted)]">
            {t("admin.qa.summary", {
              pass: report.summary.pass,
              fail: report.summary.fail,
              warn: report.summary.warn,
              skip: report.summary.skip,
            })}
            {report.summary.fail > 0 ? (
              <span className="ml-2 font-medium text-[var(--destructive)]">
                {t("admin.qa.failBlocking")}
              </span>
            ) : null}
          </p>
          <DataTable columns={columns} data={report.checks} paginator={report.checks.length > 15} rows={15} />
        </Panel>
      )}

      <Panel
        title={t("admin.qa.manualTitle")}
        subtitle={t("admin.qa.manualSubtitle", { done: manualDone, total: manualRows.length })}
      >
        <ol className="space-y-3 text-sm">
          {manualRows.map((step) => (
            <li
              key={step.id}
              className="flex flex-wrap items-start gap-3 rounded-md border border-[var(--border)] p-3"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={doneIds.has(step.id)}
                onChange={() => toggleDone(step.id)}
                aria-label={step.title}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <span className="mr-2 text-xs uppercase text-[var(--foreground-muted)]">{step.phase}</span>
                  {step.title}
                </p>
                <p className="mt-1 text-[var(--foreground-muted)]">{step.detail}</p>
                {step.href ? (
                  <Link
                    to={step.href}
                    className="mt-2 inline-flex items-center gap-1 text-[var(--primary)] hover:underline"
                  >
                    {step.href}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ) : null}
              </div>
              <StatusPill status={autoStatusPill(step.autoStatus)}>
                auto: {step.autoStatus}
              </StatusPill>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-[var(--foreground-muted)]">
          {t("admin.qa.cliHint")} <code className="rounded bg-[var(--muted)] px-1">npm run qa:platform</code>
          {activeTenant ? (
            <>
              {" · "}
              <code className="rounded bg-[var(--muted)] px-1">
                QA_TENANT_ID={activeTenant.id} npm run qa:platform
              </code>
            </>
          ) : null}
        </p>
      </Panel>

      {!report && !loading && !error && (
        <EmptyState title={t("admin.qa.emptyTitle")} description={t("admin.qa.emptyDescription")} />
      )}
    </PageFrame>
  );
}
