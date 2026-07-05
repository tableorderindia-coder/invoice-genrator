type LineItemInput = {
  billingRateUsdCents: number;
  hrsPerWeek: number;
  daysWorked?: number;
  daysInMonth?: number;
};

type CalculatedLineItem = {
  billedTotalUsdCents: number;
};

type InvoiceTotalsInput = {
  lineItems: CalculatedLineItem[];
  adjustments: number[];
};

type RealizationInput = {
  invoiceId: string;
  alreadyRealized: boolean;
  realizedAt: string;
  dollarInboundUsdCents: number;
  usdInrRate: number;
};

type EmployeePayoutMetricsInput = {
  dollarInwardUsdCents: number;
  actualPaidInrCents: number;
  pegUsdInrRate: number;
  receivedUsdInrRate: number;
};

type PegRateMarginMetricsInput = {
  dollarInwardUsdCents: number;
  pegUsdInrRate: number;
  receivedUsdInrRate: number;
  actualPaidInrCents: number;
};

type EffectiveLineTotalInput = {
  formulaTotalUsdCents: number;
  manualTotalUsdCents?: number;
};

type EffectiveTeamTotalInput = {
  lineItemTotalsUsdCents: number[];
  manualTotalUsdCents?: number;
};

type SortableInvoiceLineItem = {
  employeeNameSnapshot: string;
  billingRateUsdCents: number;
  billedTotalUsdCents: number;
  manualTotalUsdCents?: number;
};

const roundCurrency = (value: number) => Math.round(value);
const roundToWholeDollarCents = (valueInCents: number) =>
  roundCurrency(valueInCents / 100) * 100;
const MONTHS_PER_YEAR = 12;
const WEEKS_PER_YEAR = 52;

export function calculateLineItemTotals({
  billingRateUsdCents,
  hrsPerWeek,
  daysWorked,
  daysInMonth,
}: LineItemInput): CalculatedLineItem {
  const normalizedDaysInMonth =
    daysInMonth && Number.isFinite(daysInMonth) && daysInMonth > 0
      ? daysInMonth
      : 30;
  const normalizedDaysWorked =
    daysWorked === undefined
      ? normalizedDaysInMonth
      : Math.max(0, Math.round(daysWorked));

  const monthlyBilledUsdCents = roundToWholeDollarCents(
    (billingRateUsdCents * hrsPerWeek * WEEKS_PER_YEAR) / MONTHS_PER_YEAR,
  );
  const billedTotalUsdCents = roundToWholeDollarCents(
    (monthlyBilledUsdCents * normalizedDaysWorked) / normalizedDaysInMonth,
  );

  return {
    billedTotalUsdCents,
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
  const adjustmentsUsdCents = adjustments.reduce((sum, amount) => sum + amount, 0);
  const grandTotalUsdCents = subtotalUsdCents + adjustmentsUsdCents;

  return {
    subtotalUsdCents,
    adjustmentsUsdCents,
    grandTotalUsdCents,
  };
}

export function createRealizationRecord({
  invoiceId,
  alreadyRealized,
  realizedAt,
  dollarInboundUsdCents,
  usdInrRate,
}: RealizationInput) {
  if (alreadyRealized) {
    throw new Error("Invoice has already been cashed out");
  }

  return {
    invoiceId,
    realizedAt,
    dollarInboundUsdCents,
    usdInrRate,
  };
}

export function calculateEmployeePayoutMetrics({
  dollarInwardUsdCents,
  actualPaidInrCents,
  pegUsdInrRate,
  receivedUsdInrRate,
}: EmployeePayoutMetricsInput) {
  const marginMetrics = calculatePegRateMarginMetrics({
    dollarInwardUsdCents,
    actualPaidInrCents,
    pegUsdInrRate,
    receivedUsdInrRate,
  });

  return {
    totalCommissionUsdCents: dollarInwardUsdCents,
    fxCommissionInrCents: marginMetrics.forexGainInrCents,
    commissionEarnedInrCents: marginMetrics.operatingMarginInrCents,
  };
}

export function calculatePegRateMarginMetrics({
  dollarInwardUsdCents,
  pegUsdInrRate,
  receivedUsdInrRate,
  actualPaidInrCents,
}: PegRateMarginMetricsInput) {
  const totalInwardInrCents = roundCurrency(
    dollarInwardUsdCents * receivedUsdInrRate,
  );
  const operatingMarginInrCents =
    roundCurrency(dollarInwardUsdCents * pegUsdInrRate) -
    actualPaidInrCents;
  const forexGainInrCents = roundCurrency(
    dollarInwardUsdCents * (receivedUsdInrRate - pegUsdInrRate),
  );

  return {
    totalInwardInrCents,
    operatingMarginInrCents,
    forexGainInrCents,
    totalEarningInrCents: operatingMarginInrCents + forexGainInrCents,
  };
}

export function resolveEffectiveLineItemTotalUsdCents({
  formulaTotalUsdCents,
  manualTotalUsdCents,
}: EffectiveLineTotalInput) {
  return manualTotalUsdCents ?? formulaTotalUsdCents;
}

export function resolveEffectiveTeamTotalUsdCents({
  lineItemTotalsUsdCents,
  manualTotalUsdCents,
}: EffectiveTeamTotalInput) {
  if (manualTotalUsdCents !== undefined) {
    return manualTotalUsdCents;
  }

  return lineItemTotalsUsdCents.reduce((sum, lineTotal) => sum + lineTotal, 0);
}

export function sortInvoiceLineItemsByRate<T extends SortableInvoiceLineItem>(
  lineItems: T[],
) {
  const effectiveTotal = (lineItem: SortableInvoiceLineItem) =>
    lineItem.manualTotalUsdCents ?? lineItem.billedTotalUsdCents;

  return [...lineItems].sort((left, right) => {
    if (effectiveTotal(right) !== effectiveTotal(left)) {
      return effectiveTotal(right) - effectiveTotal(left);
    }

    if (right.billingRateUsdCents !== left.billingRateUsdCents) {
      return right.billingRateUsdCents - left.billingRateUsdCents;
    }

    return left.employeeNameSnapshot.localeCompare(right.employeeNameSnapshot);
  });
}
