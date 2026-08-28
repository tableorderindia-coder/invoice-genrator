import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state: {
    snapshotRow: { payload_json: unknown } | null;
    selectError: unknown;
    upserts: Array<{ sql: string; params: unknown[] }>;
    upsertError: unknown;
    deletes: Array<{ sql: string; params: unknown[] }>;
  } = {
    snapshotRow: null,
    selectError: null,
    upserts: [],
    upsertError: null,
    deletes: [],
  };

  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.trim().startsWith("select")) {
      if (state.selectError) {
        throw state.selectError;
      }
      return { rows: state.snapshotRow ? [state.snapshotRow] : [], rowCount: state.snapshotRow ? 1 : 0 };
    }

    if (sql.trim().startsWith("insert")) {
      state.upserts.push({ sql, params });
      if (state.upsertError) {
        throw state.upsertError;
      }
      return { rows: [], rowCount: 1 };
    }

    if (sql.trim().startsWith("delete")) {
      state.deletes.push({ sql, params });
      return { rows: [], rowCount: 0 };
    }

    throw new Error(`Unexpected query: ${sql}`);
  });

  return { state, query };
});

vi.mock("@/lib/db/pool", () => ({
  query: mocks.query,
}));

import {
  buildPortalSnapshotKey,
  getOrBuildPortalSnapshot,
  invalidatePortalSnapshotsForBilling,
} from "./portal-snapshot-cache";

describe("portal snapshot cache", () => {
  beforeEach(() => {
    mocks.state.snapshotRow = null;
    mocks.state.selectError = null;
    mocks.state.upserts = [];
    mocks.state.upsertError = null;
    mocks.state.deletes = [];
    mocks.query.mockClear();
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
    mocks.state.snapshotRow = { payload_json: [{ id: "employee_1" }] };
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
    expect(mocks.state.upserts).toHaveLength(1);
    expect(mocks.state.upserts[0]?.params.slice(0, 4)).toEqual([
      "company_1",
      "invoices",
      "",
      JSON.stringify([{ id: "invoice_1" }]),
    ]);
  });

  it("falls back to the source builder when the snapshot table is not migrated yet", async () => {
    mocks.state.selectError = {
      code: "42P01",
      message: 'relation "public.portal_company_snapshots" does not exist',
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

  it("returns rebuilt data when a restricted role cannot write the snapshot", async () => {
    mocks.state.upsertError = {
      code: "42501",
      message: "permission denied for table portal_company_snapshots",
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

    expect(mocks.state.deletes).toHaveLength(1);
    expect(mocks.state.deletes[0]?.params[0]).toEqual([
      "salary-month",
      "payment-months",
      "employee-cash-flow",
      "founders-balance",
    ]);
    expect(mocks.state.deletes[0]?.params[1]).toEqual(["company_1", "__global__"]);
  });
});
