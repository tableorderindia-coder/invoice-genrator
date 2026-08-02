export const PORTAL_UI_MODE_COOKIE = "eassyonboard_ui_mode";

export type PortalUiMode = "saas" | "legacy";

export function normalizePortalUiMode(value: string | null | undefined): PortalUiMode {
  return value === "legacy" ? "legacy" : "saas";
}

export function oppositePortalUiMode(mode: PortalUiMode): PortalUiMode {
  return mode === "saas" ? "legacy" : "saas";
}

export function buildPortalUiModeCookie(mode: PortalUiMode) {
  return `${PORTAL_UI_MODE_COOKIE}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
