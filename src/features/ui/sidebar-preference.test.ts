import { describe, expect, it } from "vitest";

import {
  buildSidebarCollapsedCookie,
  normalizeSidebarCollapsed,
  SIDEBAR_COLLAPSED_COOKIE,
} from "./sidebar-preference";

describe("sidebar preference", () => {
  it("defaults missing and invalid values to expanded", () => {
    expect(normalizeSidebarCollapsed(undefined)).toBe(false);
    expect(normalizeSidebarCollapsed("unknown")).toBe(false);
    expect(normalizeSidebarCollapsed("0")).toBe(false);
  });

  it("recognizes the collapsed preference", () => {
    expect(normalizeSidebarCollapsed("1")).toBe(true);
    expect(SIDEBAR_COLLAPSED_COOKIE).toBe("eassyonboard_sidebar_collapsed");
  });

  it("builds a browser-scoped persistent cookie", () => {
    expect(buildSidebarCollapsedCookie(true)).toBe(
      "eassyonboard_sidebar_collapsed=1; Path=/; Max-Age=31536000; SameSite=Lax",
    );
    expect(buildSidebarCollapsedCookie(false)).toBe(
      "eassyonboard_sidebar_collapsed=0; Path=/; Max-Age=31536000; SameSite=Lax",
    );
  });
});
