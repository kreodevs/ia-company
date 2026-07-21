import { useEffect, useState } from "react";
import { api, type TenantSummary } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function TenantImpersonationSelect() {
  const { isSuperAdmin, activeTenant, impersonate } = useAuth();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.admin
      .tenants()
      .then(setTenants)
      .finally(() => setLoading(false));
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    if (!activeTenant) return null;
    return (
      <span className="text-sm text-[var(--color-muted-foreground)]">
        {activeTenant.name}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="tenant-select" className="sr-only">
        Impersonate tenant
      </label>
      <select
        id="tenant-select"
        disabled={loading}
        value={activeTenant?.id ?? ""}
        onChange={(e) => void impersonate(e.target.value || null)}
        className="max-w-[9rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm sm:max-w-[220px] sm:px-3"
      >
        <option value="">Superadmin view</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {activeTenant && (
        <span className="hidden text-xs text-[var(--color-accent)] sm:inline">
          Viewing as {activeTenant.name}
        </span>
      )}
    </div>
  );
}
