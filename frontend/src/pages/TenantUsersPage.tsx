import { useEffect, useState } from "react";
import { api, type TenantUser, type TenantUserRole } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function TenantUsersPage() {
  const { isTenantAdmin, activeTenant } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<TenantUserRole>("member");
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api.tenantUsers
      .list()
      .then(setUsers)
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, []);

  if (!isTenantAdmin) {
    return (
      <p className="text-[var(--color-muted-foreground)]">
        Only organization owners and admins can manage users.
      </p>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.tenantUsers.create({ email, name, password, role });
      setEmail("");
      setName("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Team — {activeTenant?.name}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Manage users who can sign in with slug <code>{activeTenant?.slug}</code>
        </p>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 md:grid-cols-2"
      >
        <h2 className="md:col-span-2 font-semibold">Invite user</h2>
        <input
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          placeholder="Temporary password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as TenantUserRole)}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="md:col-span-2 rounded-lg bg-[var(--color-primary)] py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
        >
          Add user
        </button>
        {error && (
          <p className="md:col-span-2 text-sm text-[var(--color-destructive)]">{error}</p>
        )}
      </form>

      {loading ? (
        <p className="text-[var(--color-muted-foreground)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="text-[var(--color-muted-foreground)]">
              <th className="pb-2">Name</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Role</th>
              <th className="pb-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[var(--color-border)]">
                <td className="py-2">{u.name}</td>
                <td className="py-2">{u.email}</td>
                <td className="py-2 capitalize">{u.role}</td>
                <td className="py-2">{u.isActive ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
