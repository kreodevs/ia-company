const STORAGE_KEY = "auto-company-sidebar-collapsed";

export function getStoredSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function setStoredSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
}

export type NavItem = {
  to?: string;
  labelKey: string;
  end?: boolean;
  children?: NavItem[];
};

export type NavSection = {
  id: string;
  titleKey: string;
  items: NavItem[];
  /** When true, section title toggles visibility of its items (expanded sidebar only). */
  collapsible?: boolean;
};

const GROUP_STORAGE_PREFIX = "auto-company-sidebar-group-";
const SECTION_STORAGE_PREFIX = "auto-company-sidebar-section-";

export function getStoredNavGroupOpen(id: string, defaultOpen: boolean): boolean {
  if (typeof window === "undefined") return defaultOpen;
  const stored = localStorage.getItem(GROUP_STORAGE_PREFIX + id);
  if (stored === null) return defaultOpen;
  return stored === "1";
}

export function setStoredNavGroupOpen(id: string, open: boolean): void {
  localStorage.setItem(GROUP_STORAGE_PREFIX + id, open ? "1" : "0");
}

export function getStoredNavSectionOpen(id: string, defaultOpen: boolean): boolean {
  if (typeof window === "undefined") return defaultOpen;
  const stored = localStorage.getItem(SECTION_STORAGE_PREFIX + id);
  if (stored === null) return defaultOpen;
  return stored === "1";
}

export function setStoredNavSectionOpen(id: string, open: boolean): void {
  localStorage.setItem(SECTION_STORAGE_PREFIX + id, open ? "1" : "0");
}

export function sectionIsActive(pathname: string, section: NavSection): boolean {
  return section.items.some((item) => navItemIsActive(pathname, item));
}

export function flattenNavItems(items: NavItem[]): Array<Required<Pick<NavItem, "to">> & NavItem> {
  const result: Array<Required<Pick<NavItem, "to">> & NavItem> = [];
  for (const item of items) {
    if (item.children?.length) {
      result.push(...flattenNavItems(item.children));
    } else if (item.to) {
      result.push(item as Required<Pick<NavItem, "to">> & NavItem);
    }
  }
  return result;
}

export function navItemIsActive(pathname: string, item: NavItem): boolean {
  if (item.children?.length) {
    return item.children.some((child) => navItemIsActive(pathname, child));
  }
  if (!item.to) return false;
  return item.end
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`);
}
