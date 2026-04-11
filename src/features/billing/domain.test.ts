import { describe, expect, it } from "vitest";

import {
  calculateEmployeePayoutMetrics,
  calculateInvoiceTotals,
  calculateLineItemTotals,
  createRealizationRecord,
  resolveEffectiveLineItemTotalUsdCents,
  resolveEffectiveTeamTotalUsdCents,
  sortInvoiceLineItemsByRate,
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
      billedTotalUsdCents: 243800,
      payoutTotalUsdCents: 300000,
      profitTotalUsdCents: -56200,
    });
  });

  it("prorates billed totals by days worked in the invoice month", () => {
    expect(
      calculateLineItemTotals({
        billingRateUsdCents: 5000,
        payoutMonthlyUsdCents: 300000,
        hrsPerWeek: 10,
        daysWorked: 15,
        daysInMonth: 30,
      }),
    ).toEqual({
      billedTotalUsdCents: 108400,
      payoutTotalUsdCents: 300000,
      profitTotalUsdCents: -191600,
    });
  });

  it("allows billed durations longer than the invoice month", () => {
    expect(
      calculateLineItemTotals({
        billingRateUsdCents: 5000,
        payoutMonthlyUsdCents: 300000,
        hrsPerWeek: 10,
        daysWorked: 60,
        daysInMonth: 30,
      }),
    ).toEqual({
      billedTotalUsdCents: 433400,
      payoutTotalUsdCents: 300000,
      profitTotalUsdCents: 133400,
    });
  });

  it("calculates invoice totals with positive and negative adjustments", () => {
    expect(
      calculateInvoiceTotals({
        lineItems: [
          {
            billedTotalUsdCents: 243800,
            payoutTotalUsdCents: 300000,
            profitTotalUsdCents: -56200,
          },
          {
            billedTotalUsdCents: 86700,
            payoutTotalUsdCents: 100000,
            profitTotalUsdCents: -13300,
          },
        ],
        adjustments: [5000, -2500, 1000],
      }),
    ).toEqual({
      subtotalUsdCents: 330500,
      adjustmentsUsdCents: 3500,
      grandTotalUsdCents: 334000,
      payoutTotalUsdCents: 400000,
      profitTotalUsdCents: -66000,
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

  it("calculates employee payout commission metrics", () => {
    expect(
      calculateEmployeePayoutMetrics({
        dollarInwardUsdCents: 500000,
        employeeMonthlyUsdCents: 300000,
        cashoutUsdInrRate: 83.25,
        paidUsdInrRate: 82.1,
      }),
    ).toEqual({
      totalCommissionUsdCents: 200000,
      fxCommissionInrCents: 345000,
      commissionEarnedInrCents: 16650000,
    });
  });

  it("prefers manual line and team totals when present", () => {
    expect(
      resolveEffectiveLineItemTotalUsdCents({
        formulaTotalUsdCents: 100000,
        manualTotalUsdCents: 120000,
      }),
    ).toBe(120000);

    expect(
      resolveEffectiveLineItemTotalUsdCents({
        formulaTotalUsdCents: 100000,
      }),
    ).toBe(100000);

    expect(
      resolveEffectiveTeamTotalUsdCents({
        lineItemTotalsUsdCents: [120000, 90000],
        manualTotalUsdCents: 250000,
      }),
    ).toBe(250000);

    expect(
      resolveEffectiveTeamTotalUsdCents({
        lineItemTotalsUsdCents: [120000, 90000],
      }),
    ).toBe(210000);
  });

  it("sorts invoice line items by total desc, then billed rate desc, then name asc", () => {
    const sorted = sortInvoiceLineItemsByRate([
      {
        employeeNameSnapshot: "Zelda",
        billingRateUsdCents: 500000,
        billedTotalUsdCents: 100000,
      },
      {
        employeeNameSnapshot: "Adam",
        billingRateUsdCents: 700000,
        billedTotalUsdCents: 70000,
      },
      {
        employeeNameSnapshot: "Bella",
        billingRateUsdCents: 700000,
        billedTotalUsdCents: 60000,
      },
      {
        employeeNameSnapshot: "Ariana",
        billingRateUsdCents: 700000,
        billedTotalUsdCents: 60000,
      },
    ]);

    expect(sorted.map((item) => item.employeeNameSnapshot)).toEqual([
      "Zelda",
      "Adam",
      "Ariana",
      "Bella",
    ]);
  });
});
