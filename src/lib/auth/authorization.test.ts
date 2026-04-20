import { describe, expect, it } from "vitest";

import {
  canAccessPage,
  getDefaultRedirectPath,
  shouldForcePasswordReset,
  type AppPermission,
} from "./authorization";

function buildPermission(overrides: Partial<AppPermission> = {}): AppPermission {
  return {
    page: "dashboard",
    canView: false,
    canEdit: false,
    ...overrides,
  };
}

describe("authorization", () => {
  it("grants admins access to every page", () => {
    expect(
      canAccessPage({
        role: "admin",
        page: "employee-statements",
        permissions: [],
      }),
    ).toBe(true);
  });

  it("allows users onto pages they can view", () => {
    expect(
      canAccessPage({
        role: "user",
        page: "employee-statements",
        permissions: [
          buildPermission({
            page: "employee-statements",
            canView: true,
          }),
        ],
      }),
    ).toBe(true);
  });

  it("denies users when there is no matching permission", () => {
    expect(
      canAccessPage({
        role: "user",
        page: "admin-users",
        permissions: [buildPermission({ page: "dashboard", canView: true })],
      }),
    ).toBe(false);
  });

  it("forces password reset unless the user is already on an allowed auth page", () => {
    expect(
      shouldForcePasswordReset({
        mustChangePassword: true,
        pathname: "/dashboard",
      }),
    ).toBe(true);

    expect(
      shouldForcePasswordReset({
        mustChangePassword: true,
        pathname: "/reset-password",
      }),
    ).toBe(false);
  });

  it("picks the safest landing page for the current user", () => {
    expect(
      getDefaultRedirectPath({
        role: "admin",
        permissions: [],
        mustChangePassword: false,
      }),
    ).toBe("/admin/users");

    expect(
      getDefaultRedirectPath({
        role: "user",
        permissions: [
          buildPermission({ page: "dashboard", canView: true }),
          buildPermission({ page: "companies", canView: true }),
        ],
        mustChangePassword: false,
      }),
    ).toBe("/dashboard");

    expect(
      getDefaultRedirectPath({
        role: "user",
        permissions: [],
        mustChangePassword: false,
      }),
    ).toBe("/unauthorized");
  });
});
