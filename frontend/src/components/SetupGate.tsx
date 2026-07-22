import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

export function SetupGate() {
  const { loading, needsSetup, authenticated, kind } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-muted-foreground)]">
        {t("common.loading")}
      </div>
    );
  }

  if (needsSetup && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  if (!needsSetup && !authenticated && !["/login", "/setup"].includes(location.pathname)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (authenticated && ["/login", "/setup"].includes(location.pathname)) {
    return <Navigate to={kind === "tenant" ? "/workflows" : "/admin"} replace />;
  }

  return <Outlet />;
}

export function RequireSuperAdmin() {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) {
    return <Navigate to="/workflows" replace />;
  }
  return <Outlet />;
}

export function RequireTenantAccess() {
  const { activeTenant, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (!activeTenant) {
    return (
      <Navigate
        to={isSuperAdmin ? "/admin" : "/login"}
        replace
        state={{ from: location.pathname, needTenant: true }}
      />
    );
  }

  return <Outlet />;
}
