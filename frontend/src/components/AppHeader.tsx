import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import TenantImpersonationSelect from "./TenantImpersonationSelect";
import Button from "./ui/Button";
import { useAuth } from "../context/AuthContext";

interface AppHeaderProps {
  mobileSidebarOpen: boolean;
  onMobileSidebarToggle: () => void;
}

export default function AppHeader({
  mobileSidebarOpen,
  onMobileSidebarToggle,
}: AppHeaderProps) {
  const { logout } = useAuth();
  const { t } = useTranslation();

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t("nav.skipToContent", { defaultValue: "Skip to content" })}
      </a>

      <header className="app-topbar">
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

          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
            <div className="min-w-0 max-w-[min(100%,14rem)] sm:max-w-xs">
              <TenantImpersonationSelect />
            </div>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button variant="secondary" onClick={() => void logout()} className="hidden sm:inline-flex">
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
