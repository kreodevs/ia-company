import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  type AuthKind,
  type AuthStatus,
  type SuperAdmin,
  type TenantSummary,
  type TenantUser,
  type TenantUserRole,
} from "../lib/api";

interface AuthContextValue {
  loading: boolean;
  needsSetup: boolean;
  authenticated: boolean;
  kind: AuthKind | null;
  superAdmin: SuperAdmin | null;
  tenantUser: TenantUser | null;
  activeTenant: TenantSummary | null;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  refresh: () => Promise<void>;
  loginSuperAdmin: (email: string, password: string) => Promise<void>;
  loginTenant: (tenantSlug: string, email: string, password: string) => Promise<void>;
  setup: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  impersonate: (tenantId: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseStatus(status: AuthStatus) {
  if (!status.authenticated) {
    return {
      kind: null as AuthKind | null,
      superAdmin: null,
      tenantUser: null,
      activeTenant: null,
    };
  }
  if (status.kind === "tenant") {
    return {
      kind: "tenant" as const,
      superAdmin: null,
      tenantUser: status.tenantUser,
      activeTenant: status.tenant,
    };
  }
  return {
    kind: "superadmin" as const,
    superAdmin: status.superAdmin,
    tenantUser: null,
    activeTenant: status.impersonatedTenant ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AuthStatus>({
    needsSetup: false,
    authenticated: false,
  });

  const refresh = useCallback(async () => {
    const next = await api.auth.status();
    setStatus(next);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const parsed = parseStatus(status);

  const loginSuperAdmin = useCallback(
    async (email: string, password: string) => {
      await api.auth.loginSuperAdmin({ email, password });
      await refresh();
    },
    [refresh],
  );

  const loginTenant = useCallback(
    async (tenantSlug: string, email: string, password: string) => {
      await api.auth.loginTenant({ tenantSlug, email, password });
      await refresh();
    },
    [refresh],
  );

  const setup = useCallback(
    async (email: string, name: string, password: string) => {
      await api.auth.setup({ email, name, password });
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api.auth.logout();
    await refresh();
  }, [refresh]);

  const impersonate = useCallback(
    async (tenantId: string | null) => {
      await api.auth.impersonate(tenantId);
      await refresh();
    },
    [refresh],
  );

  const tenantRole = parsed.tenantUser?.role as TenantUserRole | undefined;

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      needsSetup: status.needsSetup,
      authenticated: status.authenticated,
      kind: parsed.kind,
      superAdmin: parsed.superAdmin,
      tenantUser: parsed.tenantUser,
      activeTenant: parsed.activeTenant,
      isSuperAdmin: parsed.kind === "superadmin",
      isTenantAdmin:
        parsed.kind === "tenant" && (tenantRole === "owner" || tenantRole === "admin"),
      refresh,
      loginSuperAdmin,
      loginTenant,
      setup,
      logout,
      impersonate,
    }),
    [
      loading,
      status,
      parsed,
      tenantRole,
      refresh,
      loginSuperAdmin,
      loginTenant,
      setup,
      logout,
      impersonate,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
