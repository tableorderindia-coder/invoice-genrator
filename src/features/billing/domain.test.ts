import { describe, expect, it } from "vitest";

import {
  calculateInvoiceTotals,
  calculateLineItemTotals,
  createRealizationRecord,
} from "./domain";

describe("billing domain", () => {
  it("calculates line-item billed, payout, and profit totals in cents", () => {
    expect(
      calculateLineItemTotals({
        billingRateUsdCents: 4500,
        payoutRateUsdCents: 3000,
        hoursBilled: 12.5,
      }),
    ).toEqual({
      billedTotalUsdCents: 56250,
      payoutTotalUsdCents: 37500,
      profitTotalUsdCents: 18750,
    });
  });

  it("calculates invoice totals with positive and negative adjustments", () => {
    expect(
      calculateInvoiceTotals({
        lineItems: [
          {
            billedTotalUsdCents: 56250,
            payoutTotalUsdCents: 37500,
            profitTotalUsdCents: 18750,
          },
          {
            billedTotalUsdCents: 20000,
            payoutTotalUsdCents: 12000,
            profitTotalUsdCents: 8000,
          },
        ],
        adjustments: [5000, -2500, 1000],
      }),
    ).toEqual({
      subtotalUsdCents: 76250,
      adjustmentsUsdCents: 3500,
      grandTotalUsdCents: 79750,
      payoutTotalUsdCents: 49500,
      profitTotalUsdCents: 30250,
    });
  });

  it("creates one realization record and blocks double cash-out", () => {
    expect(
      createRealizationRecord({
        invoiceId: "inv_1",
        alreadyRealized: false,
        lineItems: [
          {
            billedTotalUsdCents: 30000,
            payoutTotalUsdCents: 18000,
            profitTotalUsdCents: 12000,
          },
        ],
        adjustmentsUsdCents: 2000,
        realizedAt: "2026-06-10",
      }),
    ).toEqual({
      invoiceId: "inv_1",
      realizedAt: "2026-06-10",
      realizedRevenueUsdCents: 32000,
      realizedPayoutUsdCents: 18000,
      realizedProfitUsdCents: 14000,
    });

    expect(() =>
      createRealizationRecord({
        invoiceId: "inv_1",
        alreadyRealized: true,
        lineItems: [],
        adjustmentsUsdCents: 0,
        realizedAt: "2026-06-10",
      }),
    ).toThrow("Invoice has already been cashed out");
  });
});
