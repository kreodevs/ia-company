import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Crosshair,
  FileText,
  GitBranch,
  Inbox,
  LayoutDashboard,
  Layers,
  Package,
  Play,
  Settings,
  Sparkles,
  Bot,
  Building2,
  Users,
  Network,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "./ui/Button";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import OfficeSpendWidget from "./office/OfficeSpendWidget";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  flattenNavItems,
  getStoredSidebarCollapsed,
  getStoredNavGroupOpen,
  getStoredNavSectionOpen,
  navItemIsActive,
  sectionIsActive,
  setStoredSidebarCollapsed,
  setStoredNavGroupOpen,
  setStoredNavSectionOpen,
  type NavItem,
  type NavSection,
} from "../lib/sidebar";
import { cn } from "../lib/utils";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/templates": Layers,
  "/office/workflows": GitBranch,
  "/admin/templates/workflows": GitBranch,
  "/admin/settings": Settings,
  "/office": Building2,
  "/office/encargos": ClipboardList,
  "/office/pendientes": Inbox,
  "/products": Package,
  "/org-units": Network,
  "/org-studio": Network,
  "/war-room": Crosshair,
  "/debug/runs": Play,
  "/debug/consensus": FileText,
  "/debug/ops": Activity,
  "/debug/decisions": ClipboardCheck,
  "/ai-team": Bot,
  "/debug/skills": Sparkles,
  "/debug/team": Users,
  "/settings": Settings,
  "/help": BookOpen,
};

function SidebarNavLink({
  to,
  label,
  end = false,
  collapsed,
  nested = false,
  badge,
  onNavigate,
}: {
  to: string;
  label: string;
  end?: boolean;
  collapsed: boolean;
  nested?: boolean;
  badge?: number;
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
        nested && !collapsed && "sidebar-link-nested",
      )}
    >
      <Icon className="sidebar-link-icon" aria-hidden />
      <span className={cn("sidebar-link-label", collapsed && "sr-only")}>{label}</span>
      {!collapsed && badge != null && badge > 0 ? (
        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarNavGroup({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const groupActive = navItemIsActive(location.pathname, item);
  const groupId = item.labelKey;
  const [open, setOpen] = useState(() => getStoredNavGroupOpen(groupId, groupActive));

  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      setStoredNavGroupOpen(groupId, next);
      return next;
    });
  };

  if (collapsed) {
    return (
      <>
        {flattenNavItems(item.children ?? []).map((child) => (
          <SidebarNavLink
            key={child.to}
            to={child.to}
            end={child.end}
            label={t(child.labelKey)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </>
    );
  }

  return (
    <div className={cn("sidebar-nav-group", groupActive && "sidebar-nav-group-active")}>
      <button
        type="button"
        className="sidebar-group-toggle interactive"
        onClick={toggleOpen}
        aria-expanded={open}
      >
        <ChevronDown
          className={cn("sidebar-group-chevron", !open && "-rotate-90")}
          aria-hidden
        />
        <span className="sidebar-group-label">{t(item.labelKey)}</span>
      </button>
      {open ? (
        <div className="sidebar-nav-group-items">
          {item.children?.map((child) =>
            child.to ? (
              <SidebarNavLink
                key={child.to}
                to={child.to}
                end={child.end}
                label={t(child.labelKey)}
                collapsed={false}
                nested
                onNavigate={onNavigate}
              />
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

function SidebarNavEntry({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();

  if (item.children?.length) {
    return <SidebarNavGroup item={item} collapsed={collapsed} onNavigate={onNavigate} />;
  }
  if (!item.to) return null;
  return (
    <SidebarNavLink
      to={item.to}
      end={item.end}
      label={t(item.labelKey)}
      collapsed={collapsed}
      badge={item.badge}
      onNavigate={onNavigate}
    />
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
  const location = useLocation();
  const active = sectionIsActive(location.pathname, section);
  const [open, setOpen] = useState(() =>
    getStoredNavSectionOpen(section.id, section.collapsible ? active : true),
  );

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      setStoredNavSectionOpen(section.id, next);
      return next;
    });
  };

  const showItems = !section.collapsible || collapsed || open;

  return (
    <div className="space-y-1">
      {!collapsed && section.collapsible ? (
        <button
          type="button"
          className={cn(
            "sidebar-section-toggle interactive",
            active && "sidebar-section-toggle-active",
          )}
          onClick={toggleOpen}
          aria-expanded={open}
        >
          <ChevronDown
            className={cn("sidebar-section-chevron", !open && "-rotate-90")}
            aria-hidden
          />
          <span className="sidebar-section-title">{t(section.titleKey)}</span>
        </button>
      ) : !collapsed ? (
        <p className="sidebar-section-title">{t(section.titleKey)}</p>
      ) : (
        <div className="sidebar-section-divider" aria-hidden />
      )}
      {showItems
        ? section.items.map((item) => (
            <SidebarNavEntry
              key={item.labelKey + (item.to ?? "")}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))
        : null}
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
  const homeLink = showAdminNav ? "/admin" : "/office";

  useEffect(() => {
    onMobileClose();
  }, [location.pathname, onMobileClose]);

  useEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = collapsed ? "true" : "false";
  }, [collapsed]);

  const [pendingDecisions, setPendingDecisions] = useState(0);

  useEffect(() => {
    if (!showTenantNav) {
      setPendingDecisions(0);
      return;
    }
    let cancelled = false;
    api.office
      .dashboard()
      .then((dashboard) => {
        if (!cancelled) setPendingDecisions(dashboard.stats.pendingDecisions);
      })
      .catch(() => {
        if (!cancelled) setPendingDecisions(0);
      });
    return () => {
      cancelled = true;
    };
  }, [showTenantNav, activeTenant?.id]);

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
          {
            labelKey: "nav.groupTemplates",
            children: [
              { to: "/admin/templates", labelKey: "nav.templates", end: true },
              { to: "/admin/templates/workflows", labelKey: "nav.workflows" },
            ],
          },
        ],
      });
    }

    if (showTenantNav) {
      result.push({
        id: "office",
        titleKey: "nav.sectionOffice",
        items: [
          { to: "/office", labelKey: "nav.office", end: true },
          { to: "/office/pendientes", labelKey: "nav.pendientes", badge: pendingDecisions },
          { to: "/office/encargos", labelKey: "nav.encargos" },
          { to: "/office/workflows", labelKey: "nav.workflows" },
          { to: "/war-room", labelKey: "nav.warRoom" },
          { to: "/products", labelKey: "nav.products" },
          { to: "/org-units", labelKey: "nav.orgUnits" },
          { to: "/ai-team", labelKey: "nav.aiTeam" },
        ],
      });

      const debugItems: NavItem[] = [
        { to: "/debug/runs", labelKey: "nav.runs" },
        { to: "/debug/consensus", labelKey: "nav.consensus" },
        { to: "/debug/ops", labelKey: "nav.ops" },
        { to: "/debug/decisions", labelKey: "nav.decisions" },
      ];

      if (isTenantAdmin) {
        debugItems.push({ to: "/debug/team", labelKey: "nav.team" });
        debugItems.push({ to: "/settings", labelKey: "nav.settings" });
      }

      result.push({
        id: "debug",
        titleKey: "nav.sectionDebugOffice",
        collapsible: true,
        items: debugItems,
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
  }, [authenticated, isTenantAdmin, pendingDecisions, showAdminNav, showTenantNav]);

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
            {showTenantNav ? <OfficeSpendWidget collapsed={collapsed} /> : null}
            {!collapsed ? (
              <div className="app-sidebar-mobile-prefs flex flex-col gap-2 border-t border-[var(--surface-sidebar-border)] pt-2 md:hidden">
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>
            ) : null}
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
