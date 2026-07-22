import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type TenantUser, type TenantUserRole } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { translateApiError } from "../lib/translate-error";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

function UserCard({ user }: { user: TenantUser }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name}</p>
          <p className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">{user.email}</p>
        </div>
        <Badge>{t(`team.${user.role}`, { defaultValue: user.role })}</Badge>
      </div>
      <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
        {t("team.columns.active")}: {user.isActive ? t("common.yes") : t("common.no")}
      </p>
    </div>
  );
}

export default function TenantUsersPage() {
  const { isTenantAdmin, activeTenant } = useAuth();
  const { t } = useTranslation();
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
    return <p className="text-[var(--color-muted-foreground)]">{t("team.adminOnly")}</p>;
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
      setError(translateApiError(err, t, "team.createFailed"));
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("team.title", { tenantName: activeTenant?.name ?? "" })}
        subtitle={t("team.subtitle", { slug: activeTenant?.slug ?? "" })}
      />

      <Card>
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="grid gap-4 md:grid-cols-2"
        >
          <h2 className="md:col-span-2 font-semibold">{t("team.inviteUser")}</h2>
          <Input
            placeholder={t("common.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            placeholder={t("common.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            placeholder={t("team.temporaryPassword")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{t("team.columns.role")}</span>
            <select
              className="interactive w-full min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-sm sm:min-h-9 sm:py-2"
              value={role}
              onChange={(e) => setRole(e.target.value as TenantUserRole)}
            >
              <option value="member">{t("team.member")}</option>
              <option value="admin">{t("team.admin")}</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <Button type="submit" fullWidthMobile className="w-full md:w-auto">
              {t("team.addUser")}
            </Button>
          </div>
          {error && (
            <p className="md:col-span-2 text-sm text-[var(--color-destructive)]" role="alert">
              {error}
            </p>
          )}
        </form>
      </Card>

      {loading ? (
        <PageLoading message={t("common.loading")} />
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {users.map((u) => (
              <li key={u.id}>
                <UserCard user={u} />
              </li>
            ))}
          </ul>

          <div className="table-scroll hidden md:block">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">{t("common.name")}</th>
                  <th className="px-4 py-3">{t("common.email")}</th>
                  <th className="px-4 py-3">{t("team.columns.role")}</th>
                  <th className="px-4 py-3">{t("team.columns.active")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-muted)]/30">
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{t(`team.${u.role}`, { defaultValue: u.role })}</td>
                    <td className="px-4 py-3">{u.isActive ? t("common.yes") : t("common.no")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
