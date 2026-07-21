import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import TenantImpersonationSelect from "../components/TenantImpersonationSelect";
import { useAuth } from "../context/AuthContext";
import { api, type AdminDashboard } from "../lib/api";

export default function SuperAdminDashboardPage() {
  const { superAdmin, logout, activeTenant, impersonate } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [syncingTenantId, setSyncingTenantId] = useState<string | null>(null);
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
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    } finally {
      setCreating(false);
    }
  }

  async function handleSyncTenant(tenantId: string, name: string) {
    if (
      !confirm(
        `Sync platform templates to "${name}"? Missing agents, skills, and workflows will be added.`,
      )
    ) {
      return;
    }

    setSyncingTenantId(tenantId);
    setError(null);
    try {
      const { stats } = await api.admin.syncTenantTemplates(tenantId, { mode: "merge" });
      await load();
      setError(
        `Synced ${name}: +${stats.agents.added} agents, +${stats.skills.added} skills, +${stats.workflows.added} workflows`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingTenantId(null);
    }
  }

  if (!dashboard) {
    return <p className="text-[var(--color-muted-foreground)]">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Superadmin Dashboard</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Signed in as {superAdmin?.name} ({superAdmin?.email})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TenantImpersonationSelect />
          <button
            onClick={() => void logout()}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {needTenant && !activeTenant && (
        <div className="rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-3 text-sm">
          Select a tenant from the dropdown to access Agents, Workflows, and Runs — or create
          one below with an owner account.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Tenants", dashboard.stats.tenants],
          ["Tenant agents", dashboard.stats.tenantAgents],
          ["Tenant workflows", dashboard.stats.tenantWorkflows],
          ["Total runs", dashboard.stats.runs],
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
          <h2 className="font-semibold">Platform templates</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Seeded from <code>.claude/</code> — cloned on tenant create; sync to existing tenants from
            Templates.
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            <li>{dashboard.stats.platformTemplates.agents} agent templates</li>
            <li>{dashboard.stats.platformTemplates.skills} skill templates</li>
            <li>{dashboard.stats.platformTemplates.workflows} workflow templates</li>
          </ul>
          <Link
            to="/admin/templates"
            className="mt-4 inline-block text-sm text-[var(--color-primary)] hover:underline"
          >
            Manage templates →
          </Link>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">Create tenant</h2>
          <form onSubmit={(e) => void handleCreateTenant(e)} className="mt-4 space-y-3">
            <input
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Organization name"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
            />
            <input
              type="email"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Owner email (optional)"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Owner name (optional)"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
            <input
              type="password"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Owner password (optional, min 8)"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create tenant"}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-[var(--color-destructive)]">{error}</p>}
        </section>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="mb-4 font-semibold">Tenants</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--color-muted-foreground)]">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Slug</th>
                <th className="pb-2">Users</th>
                <th className="pb-2">Workflows</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {dashboard.tenants.map((t) => (
                <tr key={t.id} className="border-t border-[var(--color-border)]">
                  <td className="py-2 font-medium">{t.name}</td>
                  <td className="py-2 text-[var(--color-muted-foreground)]">{t.slug}</td>
                  <td className="py-2">{t._count?.users ?? 0}</td>
                  <td className="py-2">{t._count?.workflows ?? 0}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => void impersonate(t.id).then(() => navigate("/workflows"))}
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        Impersonate
                      </button>
                      <button
                        disabled={syncingTenantId === t.id}
                        onClick={() => void handleSyncTenant(t.id, t.name)}
                        className="text-[var(--color-muted-foreground)] hover:underline disabled:opacity-50"
                      >
                        {syncingTenantId === t.id ? "Syncing…" : "Sync templates"}
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
        <h2 className="mb-4 font-semibold">Audit log</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--color-muted-foreground)]">
              <tr>
                <th className="pb-2">Time</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Actor</th>
                <th className="pb-2">Tenant</th>
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
                    No audit events yet.
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
