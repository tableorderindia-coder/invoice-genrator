export const SIDEBAR_COLLAPSED_COOKIE = "eassyonboard_sidebar_collapsed";

export type SidebarPreference = "expanded" | "collapsed";

export function normalizeSidebarCollapsed(value: string | null | undefined) {
  return value === "1";
}

export function buildSidebarCollapsedCookie(collapsed: boolean) {
  return `${SIDEBAR_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
