import { formatInr, formatUsd } from "@/src/features/billing/utils";
import type {
  EmployeeCashFlowMonthRow,
  EmployeeCashFlowSalaryPaymentRow,
} from "@/src/features/billing/employee-cash-flow-types";

export default function EmployeeCashFlowDetailPanel({
  row,
  salaryPayment,
}: {
  row?: EmployeeCashFlowMonthRow;
  salaryPayment?: EmployeeCashFlowSalaryPaymentRow;
}) {
  if (!row) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Select a month and invoice to inspect employee cash reality.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl p-4" style={{ border: "1px solid var(--glass-border)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Employee
        </p>
        <p className="mt-1 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {row.employeeName}
        </p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Month
        </p>
        <p className="mt-1">{row.paymentMonth}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Invoice amount / accrual reference
        </p>
        <p className="mt-1">{row.invoiceNumber || "-"}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Total work done
        </p>
        <p className="mt-1">{`${row.daysWorked}/${row.daysInMonth} days`}</p>
      </div>

      <div className="rounded-2xl p-4" style={{ border: "1px solid var(--glass-border)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Payment received (cash)
        </p>
        <p className="mt-1">{formatInr(row.cashInInrCents)}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Salary paid
        </p>
        <p className="mt-1">{formatInr(row.salaryPaidInrCents)}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Pending amount
        </p>
        <p className="mt-1">{formatInr(row.pendingAmountInrCents)}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Net cash result
        </p>
        <p className="mt-1 font-semibold">{formatInr(row.netInrCents)}</p>
      </div>

      <div className="rounded-2xl p-4" style={{ border: "1px solid var(--glass-border)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Dollar inward
        </p>
        <p className="mt-1">{formatUsd(row.baseDollarInwardUsdCents)}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Onboarding advance
        </p>
        <p className="mt-1">{formatUsd(row.onboardingAdvanceUsdCents)}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Offboarding deduction
        </p>
        <p className="mt-1">{formatUsd(row.offboardingDeductionUsdCents)}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Effective inward
        </p>
        <p className="mt-1">{formatUsd(row.effectiveDollarInwardUsdCents)}</p>
      </div>

      <div className="rounded-2xl p-4" style={{ border: "1px solid var(--glass-border)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Monthly paid $
        </p>
        <p className="mt-1">{formatUsd(row.monthlyPaidUsdCents)}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Cashout USD/INR
        </p>
        <p className="mt-1">{row.cashoutUsdInrRate.toFixed(4)}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Paid USD/INR
        </p>
        <p className="mt-1">{row.paidUsdInrRate.toFixed(4)}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Salary snapshot
        </p>
        <p className="mt-1">
          {salaryPayment ? formatUsd(salaryPayment.salaryUsdCents) : "Not saved yet"}
        </p>
      </div>
    </div>
  );
}
