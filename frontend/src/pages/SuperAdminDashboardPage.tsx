import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TenantImpersonationSelect from "../components/TenantImpersonationSelect";
import { useAuth } from "../context/AuthContext";
import { api, type AdminDashboard } from "../lib/api";
import { translateApiError } from "../lib/translate-error";

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
      navigate("/workflows");
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
    return <p className="text-[var(--color-muted-foreground)]">{t("admin.dashboard.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.dashboard.title")}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t("common.signedInAs", {
              name: superAdmin?.name,
              email: superAdmin?.email,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TenantImpersonationSelect />
          <button
            onClick={() => void logout()}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
          >
            {t("common.logout")}
          </button>
        </div>
      </div>

      {needTenant && !activeTenant && (
        <div className="rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-3 text-sm">
          {t("admin.dashboard.needTenantBanner")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t("admin.dashboard.stats.tenants"), dashboard.stats.tenants],
          [t("admin.dashboard.stats.tenantAgents"), dashboard.stats.tenantAgents],
          [t("admin.dashboard.stats.tenantWorkflows"), dashboard.stats.tenantWorkflows],
          [t("admin.dashboard.stats.totalRuns"), dashboard.stats.runs],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <div className="text-xs uppercase text-[var(--color-muted-foreground)]">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value as number}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">{t("admin.dashboard.platformTemplates.title")}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {t("admin.dashboard.platformTemplates.subtitle")}
          </p>
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
          <Link
            to="/admin/settings"
            className="mt-4 mr-4 inline-block text-sm text-[var(--color-primary)] hover:underline"
          >
            {t("admin.dashboard.platformTemplates.platformSettingsLink")}
          </Link>
          <Link
            to="/admin/templates"
            className="mt-4 inline-block text-sm text-[var(--color-primary)] hover:underline"
          >
            {t("admin.dashboard.platformTemplates.manageTemplatesLink")}
          </Link>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">{t("admin.dashboard.createTenant.title")}</h2>
          <form onSubmit={(e) => void handleCreateTenant(e)} className="mt-4 space-y-3">
            <input
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder={t("admin.dashboard.createTenant.organizationName")}
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
            />
            <input
              type="email"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder={t("admin.dashboard.createTenant.ownerEmail")}
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder={t("admin.dashboard.createTenant.ownerName")}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
            <input
              type="password"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder={t("admin.dashboard.createTenant.ownerPassword")}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
            >
              {creating ? t("common.creating") : t("admin.dashboard.createTenant.createTenant")}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-[var(--color-destructive)]">{error}</p>}
        </section>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t("admin.dashboard.tenants.title")}</h2>
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
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--color-muted-foreground)]">
              <tr>
                <th className="pb-2">{t("common.name")}</th>
                <th className="pb-2">{t("admin.dashboard.tenants.columns.slug")}</th>
                <th className="pb-2">{t("admin.dashboard.tenants.columns.users")}</th>
                <th className="pb-2">{t("nav.workflows")}</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {dashboard.tenants.map((tenant) => (
                <tr key={tenant.id} className="border-t border-[var(--color-border)]">
                  <td className="py-2 font-medium">{tenant.name}</td>
                  <td className="py-2 text-[var(--color-muted-foreground)]">{tenant.slug}</td>
                  <td className="py-2">{tenant._count?.users ?? 0}</td>
                  <td className="py-2">{tenant._count?.workflows ?? 0}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => void impersonate(tenant.id).then(() => navigate("/workflows"))}
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        {t("admin.dashboard.tenants.impersonate")}
                      </button>
                      <button
                        disabled={syncingTenantId === tenant.id}
                        onClick={() => void handleSyncTenant(tenant.id, tenant.name)}
                        className="text-[var(--color-muted-foreground)] hover:underline disabled:opacity-50"
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
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="mb-4 font-semibold">{t("admin.dashboard.auditLog.title")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--color-muted-foreground)]">
              <tr>
                <th className="pb-2">{t("admin.dashboard.auditLog.columns.time")}</th>
                <th className="pb-2">{t("admin.dashboard.auditLog.columns.action")}</th>
                <th className="pb-2">{t("admin.dashboard.auditLog.columns.actor")}</th>
                <th className="pb-2">{t("admin.dashboard.auditLog.columns.tenant")}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-t border-[var(--color-border)]">
                  <td className="py-2 text-xs text-[var(--color-muted-foreground)]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 font-mono text-xs">{log.action}</td>
                  <td className="py-2">{log.actorEmail}</td>
                  <td className="py-2 text-[var(--color-muted-foreground)]">
                    {log.tenantId ?? "—"}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-[var(--color-muted-foreground)]">
                    {t("admin.dashboard.auditLog.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
