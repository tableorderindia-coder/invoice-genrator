import { describe, expect, it, vi } from "vitest";

import { loadOverviewAdvancePreference } from "./overview-preference";

function clientReturning(result: unknown) {
  const maybeSingle = vi.fn(async () => result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { client: { from }, from, select, eq, maybeSingle };
}

describe("overview advance preference", () => {
  it("loads a saved checked preference for the authenticated user", async () => {
    const query = clientReturning({
      data: { overview_exclude_onboarding_advance_from_net_pl: true },
      error: null,
    });

    await expect(
      loadOverviewAdvancePreference({
        supabase: query.client as never,
        userId: "user_1",
      }),
    ).resolves.toEqual({ excludeAdvanceDeduction: true, loadFailed: false });
    expect(query.from).toHaveBeenCalledWith("profiles");
    expect(query.eq).toHaveBeenCalledWith("id", "user_1");
  });

  it("uses the conservative default when Supabase returns an error", async () => {
    const query = clientReturning({ data: null, error: new Error("missing column") });

    await expect(
      loadOverviewAdvancePreference({
        supabase: query.client as never,
        userId: "user_1",
      }),
    ).resolves.toEqual({ excludeAdvanceDeduction: false, loadFailed: true });
  });

  it("uses the conservative default when Supabase throws", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              throw new Error("network unavailable");
            }),
          })),
        })),
      })),
    };

    await expect(
      loadOverviewAdvancePreference({ supabase: client as never, userId: "user_1" }),
    ).resolves.toEqual({ excludeAdvanceDeduction: false, loadFailed: true });
  });
});
