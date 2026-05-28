import { describe, expect, it } from "vitest";

import {
  FOUNDER_BALANCE_FOUNDERS,
  buildFounderBalanceModel,
  parseFounderWithdrawalRows,
} from "./founders-balance";

describe("founder's balance calculations", () => {
  it("builds monthly rows with equal founder share and cumulative availability", () => {
    const model = buildFounderBalanceModel({
      companyId: "comp_1",
      sourceRows: [
        { companyId: "comp_1", year: 2026, month: 1, netPlInrCents: 90_000 },
        { companyId: "comp_1", year: 2026, month: 2, netPlInrCents: -30_000 },
      ],
      withdrawals: [
        {
          companyId: "comp_1",
          year: 2026,
          month: 1,
          founderKey: "nirbhay_kumar_giri",
          withdrawalInrCents: 10_000,
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
        {
          companyId: "comp_1",
          year: 2026,
          month: 2,
          founderKey: "pawan_kumar_beesetti",
          withdrawalInrCents: 5_000,
          updatedAt: "2026-02-02T00:00:00.000Z",
        },
      ],
    });

    expect(model.rows).toHaveLength(2);
    expect(model.rows[0]).toMatchObject({
      year: 2026,
      month: 1,
      netPlInrCents: 90_000,
      founderShareInrCents: 90_000,
      founderEntitlementInrCents: 30_000,
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
    expect(model.rows[0].withdrawals.nirbhay_kumar_giri).toBe(10_000);
    expect(model.totals.netPlInrCents).toBe(60_000);
    expect(model.available.nirbhay_kumar_giri).toBe(10_000);
    expect(model.available.pawan_kumar_beesetti).toBe(15_000);
    expect(model.available.vishal_savaliya).toBe(20_000);
  });

  it("aggregates all-company rows by month and uses all-company withdrawals", () => {
    const model = buildFounderBalanceModel({
      companyId: null,
      sourceRows: [
        { companyId: "comp_1", year: 2026, month: 3, netPlInrCents: 60_000 },
        { companyId: "comp_2", year: 2026, month: 3, netPlInrCents: 30_000 },
      ],
      withdrawals: [
        {
          companyId: null,
          year: 2026,
          month: 3,
          founderKey: "vishal_savaliya",
          withdrawalInrCents: 12_000,
          updatedAt: "2026-03-31T00:00:00.000Z",
        },
      ],
    });

    expect(model.rows).toHaveLength(1);
    expect(model.rows[0].netPlInrCents).toBe(90_000);
    expect(model.rows[0].founderEntitlementInrCents).toBe(30_000);
    expect(model.available.vishal_savaliya).toBe(18_000);
  });

  it("parses only selected rows for saving", () => {
    const formData = new FormData();
    formData.set("rowKey", "2026-01");
    formData.set("rowKey", "2026-02");
    formData.set("selectedRow", "2026-02");
    for (const founder of FOUNDER_BALANCE_FOUNDERS) {
      formData.set(`withdrawal__2026-01__${founder.key}`, "100");
      formData.set(`withdrawal__2026-02__${founder.key}`, "250.50");
    }

    expect(parseFounderWithdrawalRows(formData)).toEqual([
      {
        year: 2026,
        month: 2,
        withdrawals: {
          nirbhay_kumar_giri: 25_050,
          pawan_kumar_beesetti: 25_050,
          vishal_savaliya: 25_050,
        },
      },
    ]);
  });

  it("rejects negative withdrawal amounts", () => {
    const formData = new FormData();
    formData.set("rowKey", "2026-01");
    formData.set("selectedRow", "2026-01");
    formData.set("withdrawal__2026-01__nirbhay_kumar_giri", "-1");

    expect(() => parseFounderWithdrawalRows(formData)).toThrow(
      "Withdrawal amounts cannot be negative.",
    );
  });
});
