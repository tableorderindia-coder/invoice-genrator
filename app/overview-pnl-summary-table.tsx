import type { OverviewPnlSummaryRow } from "@/src/features/billing/overview-pnl-summary";
import { formatInr, formatSignedInr, formatUsd } from "@/src/features/billing/utils";

type OverviewPnlSummaryTableProps = {
  rows: OverviewPnlSummaryRow[];
};

const columns = [
  { key: "company", label: "Company" },
  { key: "period", label: "Period" },
  { key: "dollarInward", label: "Total dollar inward" },
  { key: "cashIn", label: "Total cash inward INR" },
  { key: "actualPaid", label: "Actual paid INR" },
  { key: "salaryPaid", label: "Salary paid INR" },
  { key: "pf", label: "PF paid INR" },
  { key: "tds", label: "TDS paid INR" },
  { key: "fxCommission", label: "FX commission INR" },
  { key: "totalCommission", label: "Total commission USD" },
  { key: "commissionEarned", label: "Commission earned INR" },
  { key: "grossEarnings", label: "Gross earnings INR" },
  { key: "expenses", label: "Expenses INR" },
  { key: "companyReimbursementUsd", label: "Reimbursements USD" },
  { key: "companyReimbursementInr", label: "Reimbursements INR" },
  { key: "netPl", label: "Net P/L INR" },
] as const;

function netPlColor(cents: number) {
  if (cents < 0) return "#fca5a5";
  if (cents > 0) return "#6ee7b7";
  return "var(--text-primary)";
}

function renderCell(row: OverviewPnlSummaryRow, key: (typeof columns)[number]["key"]) {
  const totals = row.totals;

  switch (key) {
    case "company":
      return row.companyName;
    case "period":
      return row.periodLabel;
    case "dollarInward":
      return formatUsd(totals.dollarInwardUsdCents);
    case "cashIn":
      return formatInr(totals.cashInInrCents);
    case "actualPaid":
      return formatInr(totals.actualPaidInrCents);
    case "salaryPaid":
      return formatInr(totals.salaryPaidInrCents);
    case "pf":
      return formatInr(totals.pfInrCents);
    case "tds":
      return formatInr(totals.tdsInrCents);
    case "fxCommission":
      return formatInr(totals.fxCommissionInrCents);
    case "totalCommission":
      return formatUsd(totals.totalCommissionUsdCents);
    case "commissionEarned":
      return formatInr(totals.commissionEarnedInrCents);
    case "grossEarnings":
      return formatInr(totals.grossEarningsInrCents);
    case "expenses":
      return formatInr(totals.expensesInrCents);
    case "companyReimbursementUsd":
      return formatUsd(totals.companyReimbursementUsdCents);
    case "companyReimbursementInr":
      return formatInr(totals.companyReimbursementInrCents);
    case "netPl":
      return (
        <span style={{ color: netPlColor(totals.netPlInrCents), fontWeight: 700 }}>
          {formatSignedInr(totals.netPlInrCents)}
        </span>
      );
  }
}

export function OverviewPnlSummaryTable({ rows }: OverviewPnlSummaryTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        No P&L data found for the selected period.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
      <table className="glass-table min-w-max">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isTotal = row.companyId === "__total__";

            return (
              <tr
                key={row.companyId}
                style={
                  isTotal
                    ? {
                        background: "rgba(99, 102, 241, 0.08)",
                        color: "var(--text-primary)",
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td
                    key={`${row.companyId}-${column.key}`}
                    className={isTotal ? "font-semibold" : undefined}
                  >
                    {renderCell(row, column.key)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
