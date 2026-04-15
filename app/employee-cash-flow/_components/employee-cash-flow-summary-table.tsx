import Link from "next/link";

import { formatInr, formatUsd } from "@/src/features/billing/utils";
import type { EmployeeCashFlowMonthRow } from "@/src/features/billing/employee-cash-flow-types";

export default function EmployeeCashFlowSummaryTable({
  rows,
  selectedEmployeeId,
  baseQuery,
}: {
  rows: EmployeeCashFlowMonthRow[];
  selectedEmployeeId?: string;
  baseQuery: string;
}) {
  return (
    <div
      className="overflow-x-auto rounded-2xl"
      style={{ border: "1px solid var(--glass-border)" }}
    >
      <table className="glass-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Month</th>
            <th>Invoice</th>
            <th>Days Worked</th>
            <th>Monthly Paid $</th>
            <th>Dollar Inward</th>
            <th>Onboarding Advance</th>
            <th>Offboarding Deduction</th>
            <th>Effective Inward $</th>
            <th>Cashout USD/INR</th>
            <th>Paid rate</th>
            <th>Cash In INR</th>
            <th>Salary Paid INR</th>
            <th>Pending Amount</th>
            <th>Net</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.employeeId}-${row.paymentMonth}`}>
              <td>
                <Link
                  href={`${baseQuery}&employeeId=${encodeURIComponent(row.employeeId)}`}
                  className="font-semibold"
                  style={{
                    color:
                      row.employeeId === selectedEmployeeId
                        ? "var(--accent-1)"
                        : "var(--text-primary)",
                  }}
                >
                  {row.employeeName}
                </Link>
              </td>
              <td>{row.paymentMonth}</td>
              <td>{row.invoiceNumber || "-"}</td>
              <td>{`${row.daysWorked}/${row.daysInMonth}`}</td>
              <td>{formatUsd(row.monthlyPaidUsdCents)}</td>
              <td>{formatUsd(row.baseDollarInwardUsdCents)}</td>
              <td>{formatUsd(row.onboardingAdvanceUsdCents)}</td>
              <td>{formatUsd(row.offboardingDeductionUsdCents)}</td>
              <td>{formatUsd(row.effectiveDollarInwardUsdCents)}</td>
              <td>{row.cashoutUsdInrRate.toFixed(4)}</td>
              <td>{row.paidUsdInrRate.toFixed(4)}</td>
              <td>{formatInr(row.cashInInrCents)}</td>
              <td>{formatInr(row.salaryPaidInrCents)}</td>
              <td>{formatInr(row.pendingAmountInrCents)}</td>
              <td>{formatInr(row.netInrCents)}</td>
              <td>
                {row.status === "waiting_for_payment"
                  ? "Waiting for Payment"
                  : row.status === "loss"
                    ? "LOSS"
                    : "PROFIT"}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={16} className="py-8 text-center" style={{ color: "var(--text-muted)" }}>
                No employee cash flow rows for the selected filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
