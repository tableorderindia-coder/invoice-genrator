import { describe, expect, it } from "vitest";

import {
  calculateEmployeePayoutMetrics,
  calculatePegRateMarginMetrics,
  calculateInvoiceTotals,
  calculateLineItemTotals,
  createRealizationRecord,
  resolveEffectiveLineItemTotalUsdCents,
  resolveEffectiveTeamTotalUsdCents,
  sortInvoiceLineItemsByRate,
} from "./domain";

describe("billing domain", () => {
  it("calculates line-item billed totals without employee monthly USD", () => {
    expect(
      calculateLineItemTotals({
        billingRateUsdCents: 4500,
        hrsPerWeek: 12.5,
      }),
    ).toEqual({
      billedTotalUsdCents: 243800,
    });
  });

  it("prorates billed totals by days worked in the invoice month", () => {
    expect(
      calculateLineItemTotals({
        billingRateUsdCents: 5000,
        hrsPerWeek: 10,
        daysWorked: 15,
        daysInMonth: 30,
      }),
    ).toEqual({
      billedTotalUsdCents: 108400,
    });
  });

  it("allows billed durations longer than the invoice month", () => {
    expect(
      calculateLineItemTotals({
        billingRateUsdCents: 5000,
        hrsPerWeek: 10,
        daysWorked: 60,
        daysInMonth: 30,
      }),
    ).toEqual({
      billedTotalUsdCents: 433400,
    });
  });

  it("calculates invoice totals with positive and negative adjustments", () => {
    expect(
      calculateInvoiceTotals({
        lineItems: [
          {
            billedTotalUsdCents: 243800,
          },
          {
            billedTotalUsdCents: 86700,
          },
        ],
        adjustments: [5000, -2500, 1000],
      }),
    ).toEqual({
      subtotalUsdCents: 330500,
      adjustmentsUsdCents: 3500,
      grandTotalUsdCents: 334000,
    });
  });

  it("creates one settlement-only realization record and blocks double cash-out", () => {
    expect(
      createRealizationRecord({
        invoiceId: "inv_1",
        alreadyRealized: false,
        realizedAt: "2026-06-10",
        dollarInboundUsdCents: 32000,
        usdInrRate: 83.25,
      }),
    ).toEqual({
      invoiceId: "inv_1",
      realizedAt: "2026-06-10",
      dollarInboundUsdCents: 32000,
      usdInrRate: 83.25,
    });

    expect(() =>
      createRealizationRecord({
        invoiceId: "inv_1",
        alreadyRealized: true,
        realizedAt: "2026-06-10",
        dollarInboundUsdCents: 0,
        usdInrRate: 83.25,
      }),
    ).toThrow("Invoice has already been cashed out");
  });

  it("does not derive stale USD profit fields during cash-out", () => {
    expect(
      createRealizationRecord({
        invoiceId: "invoice_1",
        alreadyRealized: false,
        realizedAt: "2026-04-08",
        dollarInboundUsdCents: 98000,
        usdInrRate: 83.45,
      }),
    ).toEqual({
      invoiceId: "invoice_1",
      realizedAt: "2026-04-08",
      dollarInboundUsdCents: 98000,
      usdInrRate: 83.45,
    });
  });

  it("maps employee payout metrics to peg-rate margin fields", () => {
    expect(
      calculateEmployeePayoutMetrics({
        dollarInwardUsdCents: 500000,
        actualPaidInrCents: 300000,
        receivedUsdInrRate: 83.25,
        pegUsdInrRate: 82.1,
      }),
    ).toEqual({
      totalCommissionUsdCents: 500000,
      fxCommissionInrCents: 575000,
      commissionEarnedInrCents: 40750000,
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

describe("calculatePegRateMarginMetrics", () => {
  it("separates operating margin from forex gain using peg and received rates", () => {
    expect(
      calculatePegRateMarginMetrics({
        dollarInwardUsdCents: 294_700,
        pegUsdInrRate: 86,
        receivedUsdInrRate: 92.4,
        actualPaidInrCents: 21_350_000,
      }),
    ).toEqual({
      totalInwardInrCents: 27_230_280,
      operatingMarginInrCents: 3_994_200,
      forexGainInrCents: 1_886_080,
      totalEarningInrCents: 5_880_280,
    });
  });
});
