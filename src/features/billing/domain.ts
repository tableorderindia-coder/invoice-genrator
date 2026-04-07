type LineItemInput = {
  billingRateUsdCents: number;
  payoutRateUsdCents: number;
  hoursBilled: number;
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

export function calculateLineItemTotals({
  billingRateUsdCents,
  payoutRateUsdCents,
  hoursBilled,
}: LineItemInput): CalculatedLineItem {
  const billedTotalUsdCents = roundCurrency(billingRateUsdCents * hoursBilled);
  const payoutTotalUsdCents = roundCurrency(payoutRateUsdCents * hoursBilled);

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
