import { describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("@/lib/db/pool", () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

const { loadOverviewAdvancePreference } = await import("./overview-preference");

describe("overview advance preference", () => {
  it("loads a saved checked preference for the authenticated user", async () => {
    queryMock.mockReset();
    queryMock.mockResolvedValueOnce({
      rows: [{ overview_exclude_onboarding_advance_from_net_pl: true }],
      rowCount: 1,
    });

    await expect(
      loadOverviewAdvancePreference({ userId: "user_1" }),
    ).resolves.toEqual({ excludeAdvanceDeduction: true, loadFailed: false });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("public.profiles"), [
      "user_1",
    ]);
  });

  it("uses the conservative default when the query returns no row", async () => {
    queryMock.mockReset();
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(
      loadOverviewAdvancePreference({ userId: "user_1" }),
    ).resolves.toEqual({ excludeAdvanceDeduction: false, loadFailed: false });
  });

  it("uses the conservative default when the query throws", async () => {
    queryMock.mockReset();
    queryMock.mockRejectedValueOnce(new Error("connection unavailable"));

    await expect(
      loadOverviewAdvancePreference({ userId: "user_1" }),
    ).resolves.toEqual({ excludeAdvanceDeduction: false, loadFailed: true });
  });
});
