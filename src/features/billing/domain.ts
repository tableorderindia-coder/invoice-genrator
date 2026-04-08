type LineItemInput = {
  billingRateUsdCents: number;
  payoutMonthlyUsdCents: number;
  hrsPerWeek: number;
};

type CalculatedLineItem = {
  billedTotalUsdCents: number;
  payoutTotalUsdCents: number;
  profitTotalUsdCents: number;
};

type InvoiceTotalsInput = {
  lineItems: CalculatedLineItem[];
  adjustments: number[];
};

type RealizationInput = {
  invoiceId: string;
  alreadyRealized: boolean;
  lineItems: CalculatedLineItem[];
  adjustmentsUsdCents: number;
  realizedAt: string;
};

const roundCurrency = (value: number) => Math.round(value);
const MONTHS_PER_YEAR = 12;
const WEEKS_PER_YEAR = 52;

export function calculateLineItemTotals({
  billingRateUsdCents,
  payoutMonthlyUsdCents,
  hrsPerWeek,
}: LineItemInput): CalculatedLineItem {
  const billedTotalUsdCents = roundCurrency(
    (billingRateUsdCents * hrsPerWeek * WEEKS_PER_YEAR) / MONTHS_PER_YEAR,
  );
  const payoutTotalUsdCents = roundCurrency(payoutMonthlyUsdCents);

  return {
    billedTotalUsdCents,
    payoutTotalUsdCents,
    profitTotalUsdCents: billedTotalUsdCents - payoutTotalUsdCents,
  };
}

export function calculateInvoiceTotals({
  lineItems,
  adjustments,
}: InvoiceTotalsInput) {
  const subtotalUsdCents = lineItems.reduce(
    (sum, lineItem) => sum + lineItem.billedTotalUsdCents,
    0,
  );
  const payoutTotalUsdCents = lineItems.reduce(
    (sum, lineItem) => sum + lineItem.payoutTotalUsdCents,
    0,
  );
  const adjustmentsUsdCents = adjustments.reduce((sum, amount) => sum + amount, 0);
  const grandTotalUsdCents = subtotalUsdCents + adjustmentsUsdCents;

  return {
    subtotalUsdCents,
    adjustmentsUsdCents,
    grandTotalUsdCents,
    payoutTotalUsdCents,
    profitTotalUsdCents: grandTotalUsdCents - payoutTotalUsdCents,
  };
}

export function createRealizationRecord({
  invoiceId,
  alreadyRealized,
  lineItems,
  adjustmentsUsdCents,
  realizedAt,
}: RealizationInput) {
  if (alreadyRealized) {
    throw new Error("Invoice has already been cashed out");
  }

  const totals = calculateInvoiceTotals({
    lineItems,
    adjustments: [adjustmentsUsdCents],
  });

  return {
    invoiceId,
    realizedAt,
    realizedRevenueUsdCents: totals.grandTotalUsdCents,
    realizedPayoutUsdCents: totals.payoutTotalUsdCents,
    realizedProfitUsdCents: totals.profitTotalUsdCents,
  };
}
