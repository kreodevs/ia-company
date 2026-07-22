import {
  Activity,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitBranch,
  LayoutDashboard,
  Layers,
  Play,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "./ui/Button";
import { useAuth } from "../context/AuthContext";
import {
  getStoredSidebarCollapsed,
  setStoredSidebarCollapsed,
  type NavSection,
} from "../lib/sidebar";
import { cn } from "../lib/utils";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/templates": Layers,
  "/admin/templates/workflows": GitBranch,
  "/admin/settings": Settings,
  "/workflows": GitBranch,
  "/agents": Bot,
  "/runs": Play,
  "/ops": Activity,
  "/consensus": FileText,
  "/skills": Sparkles,
  "/settings": Settings,
  "/team": Users,
  "/help": BookOpen,
};

function SidebarNavLink({
  to,
  label,
  end = false,
  collapsed,
  onNavigate,
}: {
  to: string;
  label: string;
  end?: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const active = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);
  const Icon = NAV_ICONS[to] ?? FileText;

  return (
    <Link
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "sidebar-link interactive",
        active && "sidebar-link-active",
        collapsed && "sidebar-link-collapsed",
      )}
    >
      <Icon className="sidebar-link-icon" aria-hidden />
      <span className={cn("sidebar-link-label", collapsed && "sr-only")}>{label}</span>
    </Link>
  );
}

function SidebarSection({
  section,
  collapsed,
  onNavigate,
}: {
  section: NavSection;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      {!collapsed ? (
        <p className="sidebar-section-title">{t(section.titleKey)}</p>
      ) : (
        <div className="sidebar-section-divider" aria-hidden />
      )}
      {section.items.map((item) => (
        <SidebarNavLink
          key={item.to}
          to={item.to}
          end={item.end}
          label={t(item.labelKey)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const { activeTenant, authenticated, isSuperAdmin, isTenantAdmin, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => getStoredSidebarCollapsed());

  const showAdminNav = isSuperAdmin && !activeTenant;
  const showTenantNav = !!activeTenant;
  const homeLink = showAdminNav ? "/admin" : "/workflows";

  useEffect(() => {
    onMobileClose();
  }, [location.pathname, onMobileClose]);

  useEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = collapsed ? "true" : "false";
  }, [collapsed]);

  const sections = useMemo(() => {
    const result: NavSection[] = [];

    if (showAdminNav) {
      result.push({
        id: "admin",
        titleKey: "nav.sectionAdmin",
        items: [
          { to: "/admin", labelKey: "nav.admin", end: true },
          { to: "/admin/settings", labelKey: "nav.settings" },
        ],
      });
      result.push({
        id: "templates",
        titleKey: "nav.sectionTemplates",
        items: [
          { to: "/admin/templates", labelKey: "nav.templates", end: true },
          { to: "/admin/templates/workflows", labelKey: "nav.workflows" },
        ],
      });
    }

    if (showTenantNav) {
      const items: NavSection["items"] = [
        { to: "/workflows", labelKey: "nav.workflows" },
        { to: "/agents", labelKey: "nav.agents" },
        { to: "/runs", labelKey: "nav.runs" },
        { to: "/ops", labelKey: "nav.ops" },
        { to: "/consensus", labelKey: "nav.consensus" },
        { to: "/skills", labelKey: "nav.skills" },
      ];
      if (isTenantAdmin) {
        items.push({ to: "/settings", labelKey: "nav.settings" });
        items.push({ to: "/team", labelKey: "nav.team" });
      }
      result.push({
        id: "workspace",
        titleKey: "nav.sectionWorkspace",
        items,
      });
    }

    if (authenticated) {
      result.push({
        id: "general",
        titleKey: "nav.sectionGeneral",
        items: [{ to: "/help", labelKey: "nav.help" }],
      });
    }

    return result;
  }, [authenticated, isTenantAdmin, showAdminNav, showTenantNav]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      setStoredSidebarCollapsed(next);
      return next;
    });
  };

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label={t("common.closeMenu")}
          className="sidebar-backdrop lg:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        id="app-sidebar"
        data-collapsed={collapsed ? "true" : "false"}
        data-mobile-open={mobileOpen ? "true" : "false"}
        className="app-sidebar"
        aria-label={t("nav.main")}
      >
        <div className="app-sidebar-inner">
          <div className={cn("app-sidebar-brand", collapsed && "justify-center px-0")}>
            <Link
              to={homeLink}
              className={cn(
                "interactive font-[family-name:var(--font-display)] text-base font-semibold tracking-[0.02em] text-[var(--foreground)]",
                collapsed && "sr-only",
              )}
            >
              {t("common.appName")}
            </Link>
            {collapsed ? (
              <Link
                to={homeLink}
                className="interactive font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--foreground)]"
                title={t("common.appName")}
              >
                AC
              </Link>
            ) : null}
          </div>

          <nav className="app-sidebar-nav">
            {sections.map((section) => (
              <SidebarSection
                key={section.id}
                section={section}
                collapsed={collapsed}
                onNavigate={onMobileClose}
              />
            ))}
          </nav>

          <div className="app-sidebar-footer space-y-2">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="sidebar-collapse-btn interactive hidden lg:inline-flex"
              aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span className={cn(collapsed && "sr-only")}>
                {collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
              </span>
            </button>
            <Button
              variant="secondary"
              fullWidthMobile
              onClick={() => void logout()}
              className="lg:hidden"
            >
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
