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
        payoutMonthlyUsdCents: 300000,
        hrsPerWeek: 12.5,
      }),
    ).toEqual({
      billedTotalUsdCents: 243750,
      payoutTotalUsdCents: 300000,
      profitTotalUsdCents: -56250,
    });
  });

  it("calculates invoice totals with positive and negative adjustments", () => {
    expect(
      calculateInvoiceTotals({
        lineItems: [
          {
            billedTotalUsdCents: 243750,
            payoutTotalUsdCents: 300000,
            profitTotalUsdCents: -56250,
          },
          {
            billedTotalUsdCents: 86667,
            payoutTotalUsdCents: 100000,
            profitTotalUsdCents: -13333,
          },
        ],
        adjustments: [5000, -2500, 1000],
      }),
    ).toEqual({
      subtotalUsdCents: 330417,
      adjustmentsUsdCents: 3500,
      grandTotalUsdCents: 333917,
      payoutTotalUsdCents: 400000,
      profitTotalUsdCents: -66083,
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
        realizedAt: "2026-06-10",
        dollarInboundUsdCents: 32000,
        usdInrRate: 83.25,
      }),
    ).toEqual({
      invoiceId: "inv_1",
      realizedAt: "2026-06-10",
      dollarInboundUsdCents: 32000,
      usdInrRate: 83.25,
      realizedRevenueUsdCents: 32000,
      realizedPayoutUsdCents: 18000,
      realizedProfitUsdCents: 14000,
    });

    expect(() =>
      createRealizationRecord({
        invoiceId: "inv_1",
        alreadyRealized: true,
        lineItems: [],
        realizedAt: "2026-06-10",
        dollarInboundUsdCents: 0,
        usdInrRate: 83.25,
      }),
    ).toThrow("Invoice has already been cashed out");
  });

  it("derives realized payout directly from line-item payout totals", () => {
    expect(
      createRealizationRecord({
        invoiceId: "invoice_1",
        alreadyRealized: false,
        lineItems: [
          {
            billedTotalUsdCents: 100000,
            payoutTotalUsdCents: 70000,
            profitTotalUsdCents: 30000,
          },
          {
            billedTotalUsdCents: 25000,
            payoutTotalUsdCents: 5000,
            profitTotalUsdCents: 20000,
          },
        ],
        realizedAt: "2026-04-08",
        dollarInboundUsdCents: 98000,
        usdInrRate: 83.45,
      }),
    ).toEqual({
      invoiceId: "invoice_1",
      realizedAt: "2026-04-08",
      dollarInboundUsdCents: 98000,
      usdInrRate: 83.45,
      realizedRevenueUsdCents: 98000,
      realizedPayoutUsdCents: 75000,
      realizedProfitUsdCents: 23000,
    });
  });
});
