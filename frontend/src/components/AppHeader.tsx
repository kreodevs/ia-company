import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import TenantImpersonationSelect from "./TenantImpersonationSelect";
import Button from "./ui/Button";
import { useAuth } from "../context/AuthContext";

function NavLinkItem({
  to,
  children,
  onNavigate,
  end = false,
}: {
  to: string;
  children: React.ReactNode;
  onNavigate?: () => void;
  end?: boolean;
}) {
  const location = useLocation();
  const active = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`nav-link interactive ${active ? "nav-link-active" : ""}`}
    >
      {children}
    </Link>
  );
}

function MobileNavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {title}
      </p>
      {children}
    </div>
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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t("nav.skipToContent", { defaultValue: "Skip to content" })}
      </a>

      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-card)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link
              to={homeLink}
              className="interactive shrink-0 rounded-lg px-1 py-0.5 text-base font-semibold tracking-tight sm:text-lg"
            >
              {t("common.appName")}
            </Link>

            <nav className="hidden min-w-0 flex-1 flex-wrap gap-0.5 xl:flex" aria-label={t("nav.main")}>
              {isSuperAdmin && <NavLinkItem to="/admin" end>{t("nav.admin")}</NavLinkItem>}
              {isSuperAdmin && <NavLinkItem to="/admin/templates">{t("nav.templates")}</NavLinkItem>}
              {isSuperAdmin && <NavLinkItem to="/admin/settings">{t("nav.settings")}</NavLinkItem>}
              {activeTenant && (
                <>
                  <NavLinkItem to="/workflows">{t("nav.workflows")}</NavLinkItem>
                  <NavLinkItem to="/agents">{t("nav.agents")}</NavLinkItem>
                  <NavLinkItem to="/runs">{t("nav.runs")}</NavLinkItem>
                  <NavLinkItem to="/ops">{t("nav.ops")}</NavLinkItem>
                  <NavLinkItem to="/consensus">{t("nav.consensus")}</NavLinkItem>
                  <NavLinkItem to="/skills">{t("nav.skills")}</NavLinkItem>
                  {isTenantAdmin && <NavLinkItem to="/settings">{t("nav.settings")}</NavLinkItem>}
                  {isTenantAdmin && <NavLinkItem to="/team">{t("nav.team")}</NavLinkItem>}
                </>
              )}
              {authenticated && <NavLinkItem to="/help">{t("nav.help")}</NavLinkItem>}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden min-w-0 sm:block">
              <TenantImpersonationSelect />
            </div>
            <LanguageSwitcher />
            <Button variant="secondary" onClick={() => void logout()} className="hidden sm:inline-flex">
              {t("common.logout")}
            </Button>
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? t("common.closeMenu") : t("common.openMenu")}
              onClick={() => setMobileOpen((open) => !open)}
              className="interactive inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--color-border)] xl:hidden"
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
          <>
            <button
              type="button"
              aria-label={t("common.closeMenu")}
              className="fixed inset-0 z-40 bg-black/50 xl:hidden"
              onClick={closeMobile}
            />
            <nav
              id="mobile-nav"
              className="fixed inset-x-0 top-[var(--header-height)] z-50 max-h-[calc(100dvh-var(--header-height))] overflow-y-auto border-t border-[var(--color-border)] bg-[var(--color-card)] px-3 py-3 shadow-lg xl:hidden"
              aria-label={t("nav.mobile")}
            >
              <div className="mb-3 sm:hidden">
                <TenantImpersonationSelect />
              </div>

              {isSuperAdmin && (
                <MobileNavSection title={t("nav.sectionAdmin", { defaultValue: "Platform" })}>
                  <NavLinkItem to="/admin" end onNavigate={closeMobile}>
                    {t("nav.admin")}
                  </NavLinkItem>
                  <NavLinkItem to="/admin/templates" onNavigate={closeMobile}>
                    {t("nav.templates")}
                  </NavLinkItem>
                  <NavLinkItem to="/admin/settings" onNavigate={closeMobile}>
                    {t("nav.settings")}
                  </NavLinkItem>
                </MobileNavSection>
              )}

              {activeTenant && (
                <MobileNavSection title={t("nav.sectionWorkspace", { defaultValue: "Workspace" })}>
                  <NavLinkItem to="/workflows" onNavigate={closeMobile}>
                    {t("nav.workflows")}
                  </NavLinkItem>
                  <NavLinkItem to="/agents" onNavigate={closeMobile}>
                    {t("nav.agents")}
                  </NavLinkItem>
                  <NavLinkItem to="/skills" onNavigate={closeMobile}>
                    {t("nav.skills")}
                  </NavLinkItem>
                  <NavLinkItem to="/runs" onNavigate={closeMobile}>
                    {t("nav.runs")}
                  </NavLinkItem>
                  <NavLinkItem to="/ops" onNavigate={closeMobile}>
                    {t("nav.ops")}
                  </NavLinkItem>
                  <NavLinkItem to="/consensus" onNavigate={closeMobile}>
                    {t("nav.consensus")}
                  </NavLinkItem>
                  {isTenantAdmin && (
                    <NavLinkItem to="/settings" onNavigate={closeMobile}>
                      {t("nav.settings")}
                    </NavLinkItem>
                  )}
                  {isTenantAdmin && (
                    <NavLinkItem to="/team" onNavigate={closeMobile}>
                      {t("nav.team")}
                    </NavLinkItem>
                  )}
                </MobileNavSection>
              )}

              {authenticated && (
                <MobileNavSection title={t("nav.sectionGeneral", { defaultValue: "General" })}>
                  <NavLinkItem to="/help" onNavigate={closeMobile}>
                    {t("nav.help")}
                  </NavLinkItem>
                </MobileNavSection>
              )}

              <div className="mt-3 border-t border-[var(--color-border)] pt-3 sm:hidden">
                <Button variant="secondary" fullWidthMobile onClick={() => void logout()}>
                  {t("common.logout")}
                </Button>
              </div>
            </nav>
          </>
        )}
      </header>
    </>
  );
}
