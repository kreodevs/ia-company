const STORAGE_KEY = "auto-company-sidebar-collapsed";

export function getStoredSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function setStoredSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
}

export type NavItem = {
  to: string;
  labelKey: string;
  end?: boolean;
};

export type NavSection = {
  id: string;
  titleKey: string;
  items: NavItem[];
};
