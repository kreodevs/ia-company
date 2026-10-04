import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Play, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TenantImpersonationSelect from "../components/TenantImpersonationSelect";
import { api, type PlatformQaReport, type QaCheckResult } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
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

/**
 * QA automatizada contra PostgreSQL interno (solo superadmin, desde el contenedor API).
 */
export default function SuperAdminQaPage() {
  const { t } = useTranslation();
  const { activeTenant } = useAuth();
  const [report, setReport] = useState<PlatformQaReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <PageHeader
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
          </p>
          <DataTable columns={columns} data={report.checks} paginator={report.checks.length > 15} rows={15} />
          <p className="mt-4 text-sm">
            <Link to="/help" className="text-[var(--primary)] hover:underline">
              {t("admin.qa.manualDocHint")}
            </Link>
          </p>
        </Panel>
      )}

      {!report && !loading && !error && (
        <EmptyState title={t("admin.qa.emptyTitle")} description={t("admin.qa.emptyDescription")} />
      )}
    </div>
  );
}
