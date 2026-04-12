import type { EmployeeCashFlowEntryWriteInput } from "./employee-cash-flow-types";

export type EmployeeCashFlowEditableEntry = EmployeeCashFlowEntryWriteInput & {
  id: string;
};

export function aggregateEmployeeCashFlowEditableEntries(
  entries: EmployeeCashFlowEditableEntry[],
) {
  const grouped = new Map<string, EmployeeCashFlowEditableEntry>();

  for (const entry of entries) {
    const existing = grouped.get(entry.employeeId);
    if (!existing) {
      grouped.set(entry.employeeId, { ...entry });
      continue;
    }

    existing.daysWorked += entry.daysWorked;
    existing.daysInMonth = Math.max(existing.daysInMonth, entry.daysInMonth);
    existing.monthlyPaidUsdCents = Math.max(
      existing.monthlyPaidUsdCents,
      entry.monthlyPaidUsdCents,
    );
    existing.baseDollarInwardUsdCents += entry.baseDollarInwardUsdCents;
    existing.onboardingAdvanceUsdCents += entry.onboardingAdvanceUsdCents;
    existing.reimbursementUsdCents += entry.reimbursementUsdCents;
    existing.reimbursementLabelsText = [
      existing.reimbursementLabelsText,
      entry.reimbursementLabelsText,
    ]
      .filter(Boolean)
      .join(", ");
    existing.appraisalAdvanceUsdCents += entry.appraisalAdvanceUsdCents;
    existing.offboardingDeductionUsdCents += entry.offboardingDeductionUsdCents;
    existing.cashoutUsdInrRate = entry.cashoutUsdInrRate || existing.cashoutUsdInrRate;
    existing.paidUsdInrRate = entry.paidUsdInrRate || existing.paidUsdInrRate;
    existing.pfInrCents += entry.pfInrCents;
    existing.tdsInrCents += entry.tdsInrCents;
    existing.actualPaidInrCents += entry.actualPaidInrCents;
    existing.fxCommissionInrCents += entry.fxCommissionInrCents;
    existing.totalCommissionUsdCents += entry.totalCommissionUsdCents;
    existing.commissionEarnedInrCents += entry.commissionEarnedInrCents;
    existing.grossEarningsInrCents += entry.grossEarningsInrCents;
    existing.isNonInvoiceEmployee =
      existing.isNonInvoiceEmployee && entry.isNonInvoiceEmployee;
    existing.isPaid = existing.isPaid || entry.isPaid;
    existing.invoiceLineItemId =
      existing.invoiceLineItemId === entry.invoiceLineItemId
        ? existing.invoiceLineItemId
        : undefined;
    existing.paidAt =
      existing.paidAt && entry.paidAt
        ? existing.paidAt > entry.paidAt
          ? existing.paidAt
          : entry.paidAt
        : existing.paidAt ?? entry.paidAt;
    existing.notes = [existing.notes, entry.notes].filter(Boolean).join("\n").trim();
  }

  return [...grouped.values()].sort((left, right) =>
    left.employeeNameSnapshot.localeCompare(right.employeeNameSnapshot),
  );
}
