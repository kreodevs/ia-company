import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TenantImpersonationSelect from "../components/TenantImpersonationSelect";
import { useAuth } from "../context/AuthContext";
import { api, type AdminDashboard } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import StatCard from "../components/ui/StatCard";
import Panel from "../components/ui/Panel";
import EmptyState from "../components/ui/EmptyState";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function SuperAdminDashboardPage() {
  const { superAdmin, logout, activeTenant, impersonate } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [syncingTenantId, setSyncingTenantId] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<"merge" | "update">("merge");
  const [error, setError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<Awaited<ReturnType<typeof api.admin.auditLogs>>>([]);

  const needTenant = (location.state as { needTenant?: boolean } | null)?.needTenant;

  const load = async () => {
    const [dashboardData, logs] = await Promise.all([
      api.admin.dashboard(),
      api.admin.auditLogs({ limit: 20 }),
    ]);
    setDashboard(dashboardData);
    setAuditLogs(logs);
  };

  useEffect(() => {
    void load();
  }, [activeTenant]);

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { tenant } = await api.admin.createTenant({
        name: tenantName.trim(),
        cloneTemplates: true,
        ownerEmail: ownerEmail.trim() || undefined,
        ownerName: ownerName.trim() || undefined,
        ownerPassword: ownerPassword || undefined,
      });
      setTenantName("");
      setOwnerEmail("");
      setOwnerName("");
      setOwnerPassword("");
      await load();
      await impersonate(tenant.id);
      navigate("/ops");
    } catch (err) {
      setError(translateApiError(err, t, "admin.dashboard.createTenant.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function handleSyncTenant(tenantId: string, name: string) {
    if (
      syncMode === "update" &&
      !confirm(t("admin.dashboard.tenants.syncUpdateConfirm", { name }))
    ) {
      return;
    }

    if (
      syncMode === "merge" &&
      !confirm(t("admin.dashboard.tenants.syncMergeConfirm", { name }))
    ) {
      return;
    }

    setSyncingTenantId(tenantId);
    setError(null);
    try {
      const { stats } = await api.admin.syncTenantTemplates(tenantId, { mode: syncMode });
      await load();
      const updatedCount =
        stats.agents.updated + stats.skills.updated + stats.workflows.updated;
      setError(
        t("admin.dashboard.tenants.syncSuccess", {
          name,
          mode: syncMode,
          agentsAdded: stats.agents.added,
          skillsAdded: stats.skills.added,
          workflowsAdded: stats.workflows.added,
        }) +
          (updatedCount > 0
            ? t("admin.dashboard.tenants.syncUpdated", { count: updatedCount })
            : ""),
      );
    } catch (err) {
      setError(translateApiError(err, t, "common.syncFailed"));
    } finally {
      setSyncingTenantId(null);
    }
  }

  if (!dashboard) {
    return <PageLoading message={t("admin.dashboard.loading")} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <Breadcrumbs items={[{ label: t("nav.admin") }]} />
        }
        title={t("admin.dashboard.title")}
        subtitle={t("common.signedInAs", {
          name: superAdmin?.name,
          email: superAdmin?.email,
        })}
        actions={
          <>
            <TenantImpersonationSelect />
            <Button variant="secondary" onClick={() => void logout()} fullWidthMobile>
              {t("common.logout")}
            </Button>
          </>
        }
      />

      {needTenant && !activeTenant && (
        <div className="app-alert app-alert--warning" role="status">
          {t("admin.dashboard.needTenantBanner")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("admin.dashboard.stats.tenants")} value={dashboard.stats.tenants} />
        <StatCard label={t("admin.dashboard.stats.tenantAgents")} value={dashboard.stats.tenantAgents} />
        <StatCard label={t("admin.dashboard.stats.tenantWorkflows")} value={dashboard.stats.tenantWorkflows} />
        <StatCard label={t("admin.dashboard.stats.totalRuns")} value={dashboard.stats.runs} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={t("admin.dashboard.platformTemplates.title")}
          subtitle={t("admin.dashboard.platformTemplates.subtitle")}
          bodySize="sm"
        >
          <ul className="mt-4 space-y-1 text-sm">
            <li>
              {t("admin.dashboard.platformTemplates.agentTemplates", {
                count: dashboard.stats.platformTemplates.agents,
              })}
            </li>
            <li>
              {t("admin.dashboard.platformTemplates.skillTemplates", {
                count: dashboard.stats.platformTemplates.skills,
              })}
            </li>
            <li>
              {t("admin.dashboard.platformTemplates.workflowTemplates", {
                count: dashboard.stats.platformTemplates.workflows,
              })}
            </li>
          </ul>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              to="/admin/settings"
              className="interactive text-sm text-[var(--color-primary)] hover:underline"
            >
              {t("admin.dashboard.platformTemplates.platformSettingsLink")}
            </Link>
            <Link
              to="/admin/templates"
              className="interactive text-sm text-[var(--color-primary)] hover:underline"
            >
              {t("admin.dashboard.platformTemplates.manageTemplatesLink")}
            </Link>
            <Link
              to="/admin/templates/workflows"
              className="interactive text-sm text-[var(--color-primary)] hover:underline"
            >
              {t("nav.workflows")}
            </Link>
          </div>
        </Panel>

        <Panel title={t("admin.dashboard.createTenant.title")} bodySize="sm">
          <form onSubmit={(e) => void handleCreateTenant(e)} className="space-y-3">
            <Input
              placeholder={t("admin.dashboard.createTenant.organizationName")}
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder={t("admin.dashboard.createTenant.ownerEmail")}
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
            <Input
              placeholder={t("admin.dashboard.createTenant.ownerName")}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
            <Input
              type="password"
              placeholder={t("admin.dashboard.createTenant.ownerPassword")}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
            />
            <Button type="submit" disabled={creating} fullWidthMobile className="w-full">
              {creating ? t("common.creating") : t("admin.dashboard.createTenant.createTenant")}
            </Button>
          </form>
          {error && (
            <p className="mt-2 text-sm text-[var(--color-destructive)]" role="alert">
              {error}
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title={t("admin.dashboard.tenants.title")}
        bodySize="sm"
        actions={
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={syncMode === "merge"}
                onChange={() => setSyncMode("merge")}
              />
              {t("common.merge")}
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={syncMode === "update"}
                onChange={() => setSyncMode("update")}
              />
              {t("common.update")}
            </label>
          </div>
        }
      >
        {dashboard.tenants.length === 0 ? (
          <EmptyState
            title={t("admin.dashboard.tenants.emptyTitle")}
            description={t("admin.dashboard.tenants.emptyHint")}
          />
        ) : (
        <>
        <ul className="grid gap-3 md:hidden">
          {dashboard.tenants.map((tenant) => (
            <li
              key={tenant.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4"
            >
              <div className="font-medium">{tenant.name}</div>
              <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{tenant.slug}</div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-[var(--color-muted-foreground)]">{t("admin.dashboard.tenants.columns.users")}</dt>
                  <dd className="mt-0.5 font-medium">{tenant._count?.users ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted-foreground)]">{t("nav.workflows")}</dt>
                  <dd className="mt-0.5 font-medium">{tenant._count?.workflows ?? 0}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  fullWidthMobile
                  className="w-full sm:w-auto"
                  onClick={() => void impersonate(tenant.id).then(() => navigate("/ops"))}
                >
                  {t("admin.dashboard.tenants.impersonate")}
                </Button>
                <Button
                  variant="ghost"
                  disabled={syncingTenantId === tenant.id}
                  fullWidthMobile
                  className="w-full sm:w-auto"
                  onClick={() => void handleSyncTenant(tenant.id, tenant.name)}
                >
                  {syncingTenantId === tenant.id
                    ? t("common.syncing")
                    : t("admin.dashboard.tenants.syncTemplates")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="table-scroll hidden md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-4 py-3">{t("common.name")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.tenants.columns.slug")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.tenants.columns.users")}</th>
                <th className="px-4 py-3">{t("nav.workflows")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {dashboard.tenants.map((tenant) => (
                <tr key={tenant.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-muted)]/30">
                  <td className="px-4 py-3 font-medium">{tenant.name}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{tenant.slug}</td>
                  <td className="px-4 py-3">{tenant._count?.users ?? 0}</td>
                  <td className="px-4 py-3">{tenant._count?.workflows ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void impersonate(tenant.id).then(() => navigate("/ops"))}
                        className="interactive text-[var(--color-primary)] hover:underline"
                      >
                        {t("admin.dashboard.tenants.impersonate")}
                      </button>
                      <button
                        type="button"
                        disabled={syncingTenantId === tenant.id}
                        onClick={() => void handleSyncTenant(tenant.id, tenant.name)}
                        className="interactive text-[var(--color-muted-foreground)] hover:underline disabled:opacity-50"
                      >
                        {syncingTenantId === tenant.id
                          ? t("common.syncing")
                          : t("admin.dashboard.tenants.syncTemplates")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </Panel>

      <Panel title={t("admin.dashboard.auditLog.title")} bodySize="sm">
        {auditLogs.length === 0 ? (
          <EmptyState
            title={t("admin.dashboard.auditLog.empty")}
            description={t("admin.dashboard.auditLog.emptyHint")}
          />
        ) : (
        <div className="table-scroll">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-4 py-3">{t("admin.dashboard.auditLog.columns.time")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.auditLog.columns.action")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.auditLog.columns.actor")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.auditLog.columns.tenant")}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-muted)]/30">
                  <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-3">{log.actorEmail}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                    {log.tenantId ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Panel>
    </div>
  );
}
