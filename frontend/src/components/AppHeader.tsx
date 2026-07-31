import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./office/NotificationBell";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import TenantImpersonationSelect from "./TenantImpersonationSelect";
import Button from "./ui/Button";
import { defaultHelpSlug } from "../content/help";
import { cn } from "../lib/utils";

interface AppHeaderProps {
  mobileSidebarOpen: boolean;
  onMobileSidebarToggle: () => void;
}

const SCROLL_THRESHOLD_PX = 8;

export default function AppHeader({
  mobileSidebarOpen,
  onMobileSidebarToggle,
}: AppHeaderProps) {
  const { logout, activeTenant, authenticated } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const helpActive = location.pathname.startsWith("/help");

  useEffect(() => {
    const syncScrollState = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setScrolled(y > SCROLL_THRESHOLD_PX);
    };

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });
    document.addEventListener("scroll", syncScrollState, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", syncScrollState);
      document.removeEventListener("scroll", syncScrollState, { capture: true });
    };
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t("nav.skipToContent", { defaultValue: "Skip to content" })}
      </a>

      <header className={cn("app-topbar", scrolled && "app-topbar--scrolled")}>
        <div className="app-topbar-inner">
          <button
            type="button"
            aria-expanded={mobileSidebarOpen}
            aria-controls="app-sidebar"
            aria-label={mobileSidebarOpen ? t("common.closeMenu") : t("common.openMenu")}
            onClick={onMobileSidebarToggle}
            className="sidebar-menu-btn interactive lg:hidden"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              {mobileSidebarOpen ? (
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

          <div className="app-topbar-actions">
            <div className="app-topbar-tenant min-w-0">
              <TenantImpersonationSelect />
            </div>
            <div className="app-topbar-prefs hidden md:flex">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
            {authenticated ? (
              <Link
                to={`/help/${defaultHelpSlug}`}
                className={cn(
                  "interactive inline-flex lg:hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)]/50 hover:text-[var(--color-foreground)]",
                  helpActive &&
                    "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
                )}
                aria-label={t("nav.help")}
                aria-current={helpActive ? "page" : undefined}
              >
                <BookOpen className="h-5 w-5" aria-hidden />
              </Link>
            ) : null}
            {activeTenant ? <NotificationBell enabled /> : null}
            <Button variant="secondary" onClick={() => void logout()} className="hidden sm:inline-flex shrink-0">
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </header>
      <div className="app-topbar-spacer" aria-hidden="true" />
    </>
  );
}
