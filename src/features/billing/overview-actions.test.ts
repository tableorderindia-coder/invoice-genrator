import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePageAccess: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  requirePageAccess: mocks.requirePageAccess,
}));

vi.mock("@/lib/db/pool", () => ({
  query: mocks.query,
}));

import { saveOverviewAdvancePreferenceAction } from "../../../app/overview-actions";

describe("overview preference action", () => {
  beforeEach(() => {
    mocks.requirePageAccess.mockReset();
    mocks.query.mockReset();
  });

  it("saves the preference only for the authenticated user", async () => {
    mocks.requirePageAccess.mockResolvedValue({ userId: "user_1" });
    mocks.query.mockResolvedValue({ rows: [], rowCount: 1 });

    await expect(saveOverviewAdvancePreferenceAction(true)).resolves.toEqual({ ok: true });
    expect(mocks.requirePageAccess).toHaveBeenCalledWith("overview");
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("update public.profiles"),
      [true, "user_1"],
    );
  });

  it("returns a safe message when persistence fails", async () => {
    mocks.requirePageAccess.mockResolvedValue({ userId: "user_1" });
    mocks.query.mockRejectedValue(new Error("database unavailable"));

    await expect(saveOverviewAdvancePreferenceAction(false)).resolves.toEqual({
      ok: false,
      message: "Could not save the Overview preference.",
    });
  });

  it("returns a safe message when the pool throws", async () => {
    mocks.requirePageAccess.mockResolvedValue({ userId: "user_1" });
    mocks.query.mockRejectedValue(new Error("network unavailable"));

    await expect(saveOverviewAdvancePreferenceAction(true)).resolves.toEqual({
      ok: false,
      message: "Could not save the Overview preference.",
    });
  });
});
