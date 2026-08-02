import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePageAccess: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  requirePageAccess: mocks.requirePageAccess,
}));

import { saveOverviewAdvancePreferenceAction } from "../../../app/overview-actions";

describe("overview preference action", () => {
  beforeEach(() => {
    mocks.requirePageAccess.mockReset();
  });

  it("saves the preference only for the authenticated user", async () => {
    const eq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    mocks.requirePageAccess.mockResolvedValue({
      userId: "user_1",
      supabase: { from },
    });

    await expect(saveOverviewAdvancePreferenceAction(true)).resolves.toEqual({ ok: true });
    expect(mocks.requirePageAccess).toHaveBeenCalledWith("overview");
    expect(from).toHaveBeenCalledWith("profiles");
    expect(update).toHaveBeenCalledWith({
      overview_exclude_onboarding_advance_from_net_pl: true,
    });
    expect(eq).toHaveBeenCalledWith("id", "user_1");
  });

  it("returns a safe message when persistence fails", async () => {
    const eq = vi.fn(async () => ({ error: new Error("database unavailable") }));
    const update = vi.fn(() => ({ eq }));
    mocks.requirePageAccess.mockResolvedValue({
      userId: "user_1",
      supabase: { from: vi.fn(() => ({ update })) },
    });

    await expect(saveOverviewAdvancePreferenceAction(false)).resolves.toEqual({
      ok: false,
      message: "Could not save the Overview preference.",
    });
  });

  it("returns a safe message when Supabase throws", async () => {
    const eq = vi.fn(async () => {
      throw new Error("network unavailable");
    });
    const update = vi.fn(() => ({ eq }));
    mocks.requirePageAccess.mockResolvedValue({
      userId: "user_1",
      supabase: { from: vi.fn(() => ({ update })) },
    });

    await expect(saveOverviewAdvancePreferenceAction(true)).resolves.toEqual({
      ok: false,
      message: "Could not save the Overview preference.",
    });
  });
});
