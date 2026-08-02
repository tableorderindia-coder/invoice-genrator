import { describe, expect, it } from "vitest";

import {
  buildPortalUiModeCookie,
  PORTAL_UI_MODE_COOKIE,
  normalizePortalUiMode,
} from "./portal-ui-mode";

describe("portal UI mode", () => {
  it("defaults missing and invalid values to the SaaS presentation", () => {
    expect(normalizePortalUiMode(undefined)).toBe("saas");
    expect(normalizePortalUiMode("unknown")).toBe("saas");
  });

  it("preserves the explicit legacy preference", () => {
    expect(normalizePortalUiMode("legacy")).toBe("legacy");
    expect(PORTAL_UI_MODE_COOKIE).toBe("eassyonboard_ui_mode");
  });

  it("builds a browser-scoped persistent cookie", () => {
    expect(buildPortalUiModeCookie("legacy")).toBe(
      "eassyonboard_ui_mode=legacy; Path=/; Max-Age=31536000; SameSite=Lax",
    );
  });
});
