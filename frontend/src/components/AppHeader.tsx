import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import TenantImpersonationSelect from "./TenantImpersonationSelect";
import { useAuth } from "../context/AuthContext";

function NavLink({
  to,
  children,
  onNavigate,
}: {
  to: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="block rounded-lg px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] md:inline-block"
    >
      {children}
    </Link>
  );
}

export default function AppHeader() {
  const { activeTenant, authenticated, isSuperAdmin, isTenantAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const homeLink = isSuperAdmin ? "/admin" : "/workflows";
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link to={homeLink} className="shrink-0 text-lg font-semibold tracking-tight">
            {t("common.appName")}
          </Link>
          <nav className="hidden flex-wrap gap-1 md:flex">
            {isSuperAdmin && <NavLink to="/admin">{t("nav.admin")}</NavLink>}
            {isSuperAdmin && <NavLink to="/admin/templates">{t("nav.templates")}</NavLink>}
            {isSuperAdmin && <NavLink to="/admin/settings">{t("nav.settings")}</NavLink>}
            {activeTenant && (
              <>
                <NavLink to="/agents">{t("nav.agents")}</NavLink>
                <NavLink to="/skills">{t("nav.skills")}</NavLink>
                <NavLink to="/workflows">{t("nav.workflows")}</NavLink>
                <NavLink to="/runs">{t("nav.runs")}</NavLink>
                <NavLink to="/ops">{t("nav.ops")}</NavLink>
                <NavLink to="/consensus">{t("nav.consensus")}</NavLink>
                {isTenantAdmin && <NavLink to="/settings">{t("nav.settings")}</NavLink>}
                {isTenantAdmin && <NavLink to="/team">{t("nav.team")}</NavLink>}
              </>
            )}
            {authenticated && <NavLink to="/help">{t("nav.help")}</NavLink>}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <TenantImpersonationSelect />
          <LanguageSwitcher />
          <button
            onClick={() => void logout()}
            className="hidden rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm sm:inline-flex"
          >
            {t("common.logout")}
          </button>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? t("common.closeMenu") : t("common.openMenu")}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex rounded-lg border border-[var(--color-border)] p-2 md:hidden"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              {mobileOpen ? (
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <path strokeLinecap="round" d="M4 7h16" />
                  <path strokeLinecap="round" d="M4 12h16" />
                  <path strokeLinecap="round" d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-[var(--color-border)] px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {isSuperAdmin && (
              <NavLink to="/admin" onNavigate={closeMobile}>
                {t("nav.admin")}
              </NavLink>
            )}
            {isSuperAdmin && (
              <NavLink to="/admin/templates" onNavigate={closeMobile}>
                {t("nav.templates")}
              </NavLink>
            )}
            {isSuperAdmin && (
              <NavLink to="/admin/settings" onNavigate={closeMobile}>
                {t("nav.settings")}
              </NavLink>
            )}
            {activeTenant && (
              <>
                <NavLink to="/agents" onNavigate={closeMobile}>
                  {t("nav.agents")}
                </NavLink>
                <NavLink to="/skills" onNavigate={closeMobile}>
                  {t("nav.skills")}
                </NavLink>
                <NavLink to="/workflows" onNavigate={closeMobile}>
                  {t("nav.workflows")}
                </NavLink>
                <NavLink to="/runs" onNavigate={closeMobile}>
                  {t("nav.runs")}
                </NavLink>
                <NavLink to="/ops" onNavigate={closeMobile}>
                  {t("nav.ops")}
                </NavLink>
                <NavLink to="/consensus" onNavigate={closeMobile}>
                  {t("nav.consensus")}
                </NavLink>
                {isTenantAdmin && (
                  <NavLink to="/settings" onNavigate={closeMobile}>
                    {t("nav.settings")}
                  </NavLink>
                )}
                {isTenantAdmin && (
                  <NavLink to="/team" onNavigate={closeMobile}>
                    {t("nav.team")}
                  </NavLink>
                )}
              </>
            )}
            {authenticated && (
              <NavLink to="/help" onNavigate={closeMobile}>
                {t("nav.help")}
              </NavLink>
            )}
            <button
              onClick={() => void logout()}
              className="mt-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-left text-sm sm:hidden"
            >
              {t("common.logout")}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
