import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state: {
    snapshot: { payload_json: unknown } | null;
    snapshotError: unknown;
    upserts: unknown[];
    upsertError: unknown;
    deletes: Array<Record<string, unknown>>;
  } = {
    snapshot: null,
    snapshotError: null,
    upserts: [],
    upsertError: null,
    deletes: [],
  };

  const supabase = {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {
        table,
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        order: vi.fn(() => chain),
        delete: vi.fn(() => {
          state.deletes.push(chain);
          return chain;
        }),
        upsert: vi.fn((payload: unknown) => {
          state.upserts.push(payload);
          return Promise.resolve({ data: null, error: state.upsertError });
        }),
        maybeSingle: vi.fn(() =>
          Promise.resolve({ data: state.snapshot, error: state.snapshotError }),
        ),
        then: (
          resolve: (value: { data: unknown[] | null; error: unknown }) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
      };
      return chain;
    }),
  };

  return { state, supabase };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => mocks.supabase),
}));

import {
  buildPortalSnapshotKey,
  getOrBuildPortalSnapshot,
  invalidatePortalSnapshotsForBilling,
} from "./portal-snapshot-cache";

describe("portal snapshot cache", () => {
  beforeEach(() => {
    mocks.state.snapshot = null;
    mocks.state.snapshotError = null;
    mocks.state.upserts = [];
    mocks.state.upsertError = null;
    mocks.state.deletes = [];
    mocks.supabase.from.mockClear();
  });

  it("builds stable company-scoped snapshot keys", () => {
    expect(
      buildPortalSnapshotKey({
        companyId: "company_b",
        snapshotType: "employees",
      }),
    ).toEqual({
      companyId: "company_b",
      snapshotType: "employees",
      monthKey: "",
    });

    expect(
      buildPortalSnapshotKey({
        companyId: "company_a",
        snapshotType: "salary-month",
        monthKey: "2026-07",
      }),
    ).toEqual({
      companyId: "company_a",
      snapshotType: "salary-month",
      monthKey: "2026-07",
    });
  });

  it("returns a stored snapshot without rebuilding", async () => {
    mocks.state.snapshot = { payload_json: [{ id: "employee_1" }] };
    const builder = vi.fn(async () => [{ id: "rebuilt" }]);

    const data = await getOrBuildPortalSnapshot({
      key: buildPortalSnapshotKey({ companyId: "company_1", snapshotType: "employees" }),
      build: builder,
    });

    expect(data).toEqual([{ id: "employee_1" }]);
    expect(builder).not.toHaveBeenCalled();
    expect(mocks.state.upserts).toEqual([]);
  });

  it("rebuilds and stores a missing snapshot", async () => {
    const builder = vi.fn(async () => [{ id: "invoice_1" }]);

    const data = await getOrBuildPortalSnapshot({
      key: buildPortalSnapshotKey({ companyId: "company_1", snapshotType: "invoices" }),
      build: builder,
    });

    expect(data).toEqual([{ id: "invoice_1" }]);
    expect(builder).toHaveBeenCalledTimes(1);
    expect(mocks.state.upserts[0]).toMatchObject({
      company_id: "company_1",
      snapshot_type: "invoices",
      month_key: "",
      payload_json: [{ id: "invoice_1" }],
    });
  });

  it("falls back to the source builder when the snapshot table is not migrated yet", async () => {
    mocks.state.snapshotError = {
      code: "PGRST205",
      message: "Could not find the table 'public.portal_company_snapshots'",
    };
    const builder = vi.fn(async () => ["2026-07"]);

    const data = await getOrBuildPortalSnapshot({
      key: buildPortalSnapshotKey({ companyId: "company_1", snapshotType: "payment-months" }),
      build: builder,
    });

    expect(data).toEqual(["2026-07"]);
    expect(builder).toHaveBeenCalledTimes(1);
    expect(mocks.state.upserts).toEqual([]);
  });

  it("returns rebuilt data when a view-only session cannot write the snapshot", async () => {
    mocks.state.upsertError = {
      code: "42501",
      message: "new row violates row-level security policy for table portal_company_snapshots",
    };
    const builder = vi.fn(async () => [{ id: "company_1" }]);

    const data = await getOrBuildPortalSnapshot({
      key: buildPortalSnapshotKey({ snapshotType: "companies" }),
      build: builder,
    });

    expect(data).toEqual([{ id: "company_1" }]);
    expect(builder).toHaveBeenCalledTimes(1);
    expect(mocks.state.upserts).toHaveLength(1);
  });

  it("invalidates affected salary snapshots after salary writes", async () => {
    await invalidatePortalSnapshotsForBilling({
      type: "salary",
      companyId: "company_1",
      month: "2026-07",
    });

    expect(mocks.supabase.from).toHaveBeenCalledWith("portal_company_snapshots");
    expect(mocks.state.deletes).toHaveLength(1);
    expect(mocks.state.deletes[0]?.in).toHaveBeenCalledWith("snapshot_type", [
      "salary-month",
      "payment-months",
      "employee-cash-flow",
      "founders-balance",
    ]);
  });
});
