"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { PendingActionButton } from "../_components/pending-action-button";
import { inputClass } from "../_components/field";
import {
  buildEmployeeSectionTotals,
  buildPeriodTotals,
} from "../../src/features/billing/dashboard-table-totals";
import type {
  PnDashboardData,
  PnEmployeeEditableRow,
  PnPeriodRow,
  PnPeriodType,
} from "../../src/features/billing/types";
import {
  formatInr,
  formatMonthYear,
  formatSignedInr,
  formatUsd,
} from "../../src/features/billing/utils";
import { getVisibleToggleColumns } from "../../src/features/billing/dashboard-column-visibility";

type DashboardTablesProps = {
  view: "employee" | "period";
  periodType: PnPeriodType;
  data: PnDashboardData;
  returnTo: string;
  updateDashboardEmployeeCashFlowEntryAction: (formData: FormData) => Promise<void>;
};

export function DashboardTables({
  view,
  periodType,
  data,
  returnTo,
  updateDashboardEmployeeCashFlowEntryAction,
}: DashboardTablesProps) {
  const [showDetails, setShowDetails] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("dashboardShowDetails");
    if (!saved) return false;
    try {
      return JSON.parse(saved);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    window.localStorage.setItem("dashboardShowDetails", JSON.stringify(showDetails));
  }, [showDetails]);

  const toggleColumns = useMemo(
    () => getVisibleToggleColumns(showDetails),
    [showDetails],
  );

  const toggleButton = (
    <button
      type="button"
      onClick={() => setShowDetails((prev: boolean) => !prev)}
      className="btn-outline"
      title="Toggle Details"
    >
      {showDetails ? "🙈 Hide details" : "👁 Show details"}
    </button>
  );

  if (view === "employee") {
    return (
      <EmployeeTables
        data={data}
        returnTo={returnTo}
        toggleColumns={toggleColumns}
        toggleButton={toggleButton}
        updateDashboardEmployeeCashFlowEntryAction={updateDashboardEmployeeCashFlowEntryAction}
      />
    );
  }

  return (
    <PeriodTables
      data={data}
      periodType={periodType}
      toggleColumns={toggleColumns}
      toggleButton={toggleButton}
    />
  );
}

type ToggleColumn = ReturnType<typeof getVisibleToggleColumns>[number];

type Column<Row> = {
  key: string;
  label: string;
  render: (row: Row) => React.ReactNode;
};

function netProfitColor(cents: number) {
  if (cents < 0) return "#fca5a5";
  if (cents > 0) return "#6ee7b7";
  return "var(--text-primary)";
}

function calculateMonthlyPaidInrCents(monthlyUsdCents: number, paidUsdInrRate: number) {
  return Math.round(monthlyUsdCents * paidUsdInrRate);
}

function formatRate(rate: number | null) {
  if (rate === null) {
    return "-";
  }

  return rate.toFixed(4);
}

type EmployeeTablesProps = {
  data: PnDashboardData;
  returnTo: string;
  toggleColumns: ToggleColumn[];
  toggleButton: ReactNode;
  updateDashboardEmployeeCashFlowEntryAction: (formData: FormData) => Promise<void>;
};

function EmployeeTables({
  data,
  returnTo,
  toggleColumns,
  toggleButton,
  updateDashboardEmployeeCashFlowEntryAction,
}: EmployeeTablesProps) {
  const renderToggleCell = (key: ToggleColumn["key"], row: PnEmployeeEditableRow) => {
    const formId = `dashboard-payout-${row.payoutId}`;
    switch (key) {
      case "dollarInward":
        return (
          <input
            form={formId}
            type="number"
            name="dollarInwardUsd"
            min="0"
            step="0.01"
            defaultValue={(row.dollarInwardUsdCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "8rem",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          />
        );
      case "onboardingAdvance":
        return (
          <input
            form={formId}
            type="number"
            name="onboardingAdvanceUsd"
            min="0"
            step="0.01"
            defaultValue={(row.onboardingAdvanceUsdCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "8rem",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          />
        );
      case "reimbursements":
        return (
          <input
            form={formId}
            type="number"
            name="reimbursementUsd"
            min="0"
            step="0.01"
            defaultValue={(row.reimbursementUsdCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "8rem",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          />
        );
      case "reimbursementLabels":
        return (
          <input
            form={formId}
            type="text"
            name="reimbursementLabelsText"
            defaultValue={row.reimbursementLabelsText}
            className={inputClass}
            style={{
              minWidth: "10rem",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          />
        );
      case "reimbursementsInr":
        return formatInr(row.reimbursementInrCents);
      case "appraisalAdvance":
        return (
          <input
            form={formId}
            type="number"
            name="appraisalAdvanceUsd"
            min="0"
            step="0.01"
            defaultValue={(row.appraisalAdvanceUsdCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "8rem",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          />
        );
      case "appraisalAdvanceInr":
        return formatInr(row.appraisalAdvanceInrCents);
      case "offboardingDeduction":
        return (
          <input
            form={formId}
            type="number"
            name="offboardingDeductionUsd"
            min="0"
            step="0.01"
            defaultValue={(row.offboardingDeductionUsdCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "8rem",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          />
        );
      case "effectiveDollarInward":
        return formatUsd(row.effectiveDollarInwardUsdCents);
      default:
        return null;
    }
  };

  const employeePrefixColumns: Column<PnEmployeeEditableRow>[] = [
    {
      key: "month",
      label: "Month",
      render: (row) => formatMonthYear(row.month, row.year),
    },
    {
      key: "daysWorked",
      label: "Days worked",
      render: (row) => (
        <>
          <form
            id={`dashboard-payout-${row.payoutId}`}
            action={updateDashboardEmployeeCashFlowEntryAction}
          ></form>
          <input
            type="hidden"
            form={`dashboard-payout-${row.payoutId}`}
            name="payoutId"
            value={row.payoutId}
          />
          <input
            type="hidden"
            form={`dashboard-payout-${row.payoutId}`}
            name="returnTo"
            value={returnTo}
          />
          <div className="flex items-center gap-2">
            <input
              form={`dashboard-payout-${row.payoutId}`}
              type="number"
              name="daysWorked"
              min="1"
              step="1"
              defaultValue={row.daysWorked}
              className={inputClass}
              style={{
                minWidth: "6rem",
                border: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
              }}
            />
            <span style={{ color: "var(--text-muted)" }}>/ {row.daysInMonth}</span>
          </div>
        </>
      ),
    },
  ];

  const employeeSuffixColumns: Column<PnEmployeeEditableRow>[] = [
    {
      key: "cashoutRate",
      label: "Cashout rate",
      render: (row) => (
        <input
          form={`dashboard-payout-${row.payoutId}`}
          type="number"
          name="cashoutUsdInrRate"
          min="0"
          step="0.0001"
          defaultValue={row.cashoutUsdInrRate.toFixed(4)}
          className={inputClass}
          style={{
            minWidth: "7rem",
            border: "1px solid var(--glass-border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-primary)",
          }}
        />
      ),
    },
    {
      key: "cashIn",
      label: "Cash in (INR)",
      render: (row) => formatInr(row.cashInInrCents),
    },
    {
      key: "monthlyUsd",
      label: "Monthly $",
      render: (row) => (
        <input
          form={`dashboard-payout-${row.payoutId}`}
          type="number"
          name="employeeMonthlyUsd"
          min="0.01"
          step="0.01"
          defaultValue={(row.employeeMonthlyUsdCents / 100).toFixed(2)}
          className={inputClass}
          style={{
            minWidth: "8rem",
            border: "1px solid var(--glass-border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-primary)",
          }}
        />
      ),
    },
    {
      key: "paidRate",
      label: "Paid rate",
      render: (row) =>
        row.isSecurityDepositMonth ? (
          <>
            <input
              type="hidden"
              form={`dashboard-payout-${row.payoutId}`}
              name="paidUsdInrRate"
              value="0"
            />
            <span style={{ color: "var(--text-muted)" }}>-</span>
          </>
        ) : (
          <input
            form={`dashboard-payout-${row.payoutId}`}
            type="number"
            name="paidUsdInrRate"
            min="0"
            step="0.0001"
            defaultValue={row.paidUsdInrRate.toFixed(4)}
            className={inputClass}
            style={{
              minWidth: "7rem",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          />
        ),
    },
    {
      key: "monthlyPaidInr",
      label: "Monthly paid INR",
      render: (row) =>
        formatInr(
          calculateMonthlyPaidInrCents(row.employeeMonthlyUsdCents, row.paidUsdInrRate),
        ),
    },
    {
      key: "actualPaid",
      label: "Actual paid (INR)",
      render: (row) => (
        <input
          form={`dashboard-payout-${row.payoutId}`}
          type="number"
          name="actualPaidInr"
          min="0"
          step="0.01"
          defaultValue={(row.actualPaidInrCents / 100).toFixed(2)}
          className={inputClass}
          style={{
            minWidth: "8rem",
            border: "1px solid var(--glass-border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-primary)",
          }}
        />
      ),
    },
    {
      key: "pf",
      label: "PF (INR)",
      render: (row) => (
        <input
          form={`dashboard-payout-${row.payoutId}`}
          type="number"
          name="pfInr"
          min="0"
          step="0.01"
          defaultValue={(row.pfInrCents / 100).toFixed(2)}
          className={inputClass}
          style={{
            minWidth: "8rem",
            border: "1px solid var(--glass-border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-primary)",
          }}
        />
      ),
    },
    {
      key: "tds",
      label: "TDS (INR)",
      render: (row) => (
        <input
          form={`dashboard-payout-${row.payoutId}`}
          type="number"
          name="tdsInr"
          min="0"
          step="0.01"
          defaultValue={(row.tdsInrCents / 100).toFixed(2)}
          className={inputClass}
          style={{
            minWidth: "8rem",
            border: "1px solid var(--glass-border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-primary)",
          }}
        />
      ),
    },
    {
      key: "salaryPaid",
      label: "Salary paid",
      render: (row) =>
        formatInr(row.actualPaidInrCents - row.pfInrCents - row.tdsInrCents),
    },
    {
      key: "fxCommission",
      label: "FX commission (INR)",
      render: (row) => formatInr(row.fxCommissionInrCents),
    },
    {
      key: "totalCommission",
      label: "Total commission (USD)",
      render: (row) => formatUsd(row.totalCommissionUsdCents),
    },
    {
      key: "commissionEarned",
      label: "Commission earned (INR)",
      render: (row) => formatInr(row.commissionEarnedInrCents),
    },
    {
      key: "grossEarnings",
      label: "Gross earnings (INR)",
      render: (row) => formatInr(row.grossEarningsInrCents),
    },
    {
      key: "netProfit",
      label: "Net Profit (INR)",
      render: (row) => (
        <span style={{ color: netProfitColor(row.netProfitInrCents) }}>
          {formatSignedInr(row.netProfitInrCents)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <PendingActionButton
          form={`dashboard-payout-${row.payoutId}`}
          className="btn-outline"
          defaultText="Update"
          pendingText="Updating..."
        />
      ),
    },
  ];

  const columns: Column<PnEmployeeEditableRow>[] = [
    ...employeePrefixColumns,
    ...toggleColumns.map((col) => ({
      key: col.key,
      label: col.label,
      render: (row: PnEmployeeEditableRow) => renderToggleCell(col.key, row),
    })),
    ...employeeSuffixColumns,
  ];

  const renderEmployeeTotalCell = (
    column: Column<PnEmployeeEditableRow>,
    totals: ReturnType<typeof buildEmployeeSectionTotals>,
  ) => {
    switch (column.key) {
      case "month":
        return "Totals";
      case "daysWorked":
        return totals.daysWorked;
      case "dollarInward":
        return formatUsd(totals.dollarInwardUsdCents);
      case "onboardingAdvance":
        return formatUsd(totals.onboardingAdvanceUsdCents);
      case "reimbursements":
        return formatUsd(totals.reimbursementUsdCents);
      case "reimbursementLabels":
        return "";
      case "reimbursementsInr":
        return formatInr(totals.reimbursementInrCents);
      case "appraisalAdvance":
        return formatUsd(totals.appraisalAdvanceUsdCents);
      case "appraisalAdvanceInr":
        return formatInr(totals.appraisalAdvanceInrCents);
      case "offboardingDeduction":
        return formatUsd(totals.offboardingDeductionUsdCents);
      case "effectiveDollarInward":
        return formatUsd(totals.effectiveDollarInwardUsdCents);
      case "cashoutRate":
        return formatRate(totals.cashoutUsdInrRate);
      case "cashIn":
        return formatInr(totals.cashInInrCents);
      case "monthlyUsd":
        return formatUsd(totals.employeeMonthlyUsdCents);
      case "paidRate":
        return formatRate(totals.paidUsdInrRate);
      case "monthlyPaidInr":
        return formatInr(totals.monthlyPaidInrCents);
      case "actualPaid":
        return formatInr(totals.actualPaidInrCents);
      case "pf":
        return formatInr(totals.pfInrCents);
      case "tds":
        return formatInr(totals.tdsInrCents);
      case "salaryPaid":
        return formatInr(totals.salaryPaidInrCents);
      case "fxCommission":
        return formatInr(totals.fxCommissionInrCents);
      case "totalCommission":
        return formatUsd(totals.totalCommissionUsdCents);
      case "commissionEarned":
        return formatInr(totals.commissionEarnedInrCents);
      case "grossEarnings":
        return formatInr(totals.grossEarningsInrCents);
      case "netProfit":
        return (
          <span style={{ color: netProfitColor(totals.netProfitInrCents) }}>
            {formatSignedInr(totals.netProfitInrCents)}
          </span>
        );
      case "actions":
        return "";
      default:
        return "-";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">{toggleButton}</div>
      {data.employeeEditableSections.map((section) => (
        <div
          key={section.employeeId}
          className="rounded-2xl p-4"
          style={{
            border: "1px solid var(--glass-border)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {section.employeeName}
          </h3>
          <div
            className="mt-3 overflow-x-auto rounded-2xl"
            style={{ border: "1px solid var(--glass-border)" }}
          >
            <table className="glass-table min-w-max">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.payoutId}>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render(row)}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  {columns.map((column) => (
                    <td
                      key={`employee-total-${section.employeeId}-${column.key}`}
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {renderEmployeeTotalCell(
                        column,
                        buildEmployeeSectionTotals(section.rows),
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {data.employeeEditableSections.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No employee cash flow records found for selected filters.
        </p>
      ) : null}
    </div>
  );
}

type PeriodTablesProps = {
  data: PnDashboardData;
  periodType: PnPeriodType;
  toggleColumns: ToggleColumn[];
  toggleButton: ReactNode;
};

function PeriodTables({
  data,
  periodType,
  toggleColumns,
  toggleButton,
}: PeriodTablesProps) {
  const [includeExpenses, setIncludeExpenses] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("dashboardIncludeExpenses");
    if (saved === null) return true;
    try {
      return JSON.parse(saved);
    } catch {
      return true;
    }
  });
  const [includeReimbursements, setIncludeReimbursements] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("dashboardIncludeReimbursements");
    if (saved === null) return true;
    try {
      return JSON.parse(saved);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboardIncludeExpenses", JSON.stringify(includeExpenses));
    }
  }, [includeExpenses]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboardIncludeReimbursements", JSON.stringify(includeReimbursements));
    }
  }, [includeReimbursements]);

  // Compute dynamic Net P/L for each row
  const computeNetPl = (row: PnPeriodRow) => {
    let net = row.netPlInrCents; // base (just employee net profit)
    if (includeReimbursements) net += row.companyReimbursementInrCents;
    if (includeExpenses) net -= row.expensesInrCents;
    return net;
  };

  const renderToggleCell = (key: ToggleColumn["key"], row: PnPeriodRow) => {
    const details = row;
    switch (key) {
      case "dollarInward":
        return formatUsd(row.dollarInwardUsdCents);
      case "onboardingAdvance":
        return formatUsd(details.onboardingAdvanceUsdCents ?? 0);
      case "reimbursements":
        return formatUsd(row.reimbursementUsdCents);
      case "reimbursementLabels":
        return details.reimbursementLabelsText || "-";
      case "reimbursementsInr":
        return formatInr(row.reimbursementInrCents);
      case "appraisalAdvance":
        return formatUsd(row.appraisalAdvanceUsdCents);
      case "appraisalAdvanceInr":
        return formatInr(row.appraisalAdvanceInrCents);
      case "offboardingDeduction":
        return formatUsd(details.offboardingDeductionUsdCents ?? 0);
      case "effectiveDollarInward":
        return formatUsd(details.effectiveDollarInwardUsdCents ?? row.dollarInwardUsdCents);
      default:
        return null;
    }
  };

  const periodPrefixColumns: Column<PnPeriodRow>[] = [
    {
      key: "period",
      label: "Period",
      render: (row) =>
        periodType === "monthly"
          ? formatMonthYear(row.month ?? 1, row.year)
          : String(row.year),
    },
  ];

  // Checkbox header label helper
  const checkboxHeader = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div className="flex flex-col items-start gap-1">
      <label className="flex items-center gap-1.5 cursor-pointer select-none" style={{ fontSize: "0.65rem", color: checked ? "#6ee7b7" : "var(--text-muted)" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ accentColor: "var(--accent-1)", width: 13, height: 13 }}
        />
        In P/L
      </label>
      <span>{label}</span>
    </div>
  );

  const periodSuffixColumns: Column<PnPeriodRow>[] = [
    {
      key: "actualPaid",
      label: "Actual paid (INR)",
      render: (row) => formatInr(row.actualPaidInrCents),
    },
    {
      key: "pf",
      label: "PF (INR)",
      render: (row) => formatInr(row.pfInrCents),
    },
    {
      key: "tds",
      label: "TDS (INR)",
      render: (row) => formatInr(row.tdsInrCents),
    },
    {
      key: "salaryPaid",
      label: "Salary paid (INR)",
      render: (row) => formatInr(row.salaryPaidInrCents),
    },
    {
      key: "fxCommission",
      label: "FX commission (INR)",
      render: (row) => formatInr(row.fxCommissionInrCents),
    },
    {
      key: "totalCommission",
      label: "Total commission (USD)",
      render: (row) => formatUsd(row.totalCommissionUsdCents),
    },
    {
      key: "commissionEarned",
      label: "Commission earned (INR)",
      render: (row) => formatInr(row.commissionEarnedInrCents),
    },
    {
      key: "grossEarnings",
      label: "Gross earnings (INR)",
      render: (row) => formatInr(row.grossEarningsInrCents),
    },
  ];

  // Expense + Reimbursement + Net P/L columns — these are always shown
  const financialColumns: Column<PnPeriodRow>[] = [
    {
      key: "expenses",
      label: "__custom_expenses__",
      render: (row) => (
        <span style={{ color: row.expensesInrCents > 0 ? "#fca5a5" : "var(--text-primary)" }}>
          {formatInr(row.expensesInrCents)}
        </span>
      ),
    },
    {
      key: "companyReimbursementUsd",
      label: "__custom_reimbursement_usd__",
      render: (row) => formatUsd(row.companyReimbursementUsdCents),
    },
    {
      key: "companyReimbursementInr",
      label: "__custom_reimbursement_inr__",
      render: (row) => (
        <span style={{ color: row.companyReimbursementInrCents > 0 ? "#6ee7b7" : "var(--text-primary)" }}>
          {formatInr(row.companyReimbursementInrCents)}
        </span>
      ),
    },
    {
      key: "netPl",
      label: "Net P/L (INR)",
      render: (row) => {
        const net = computeNetPl(row);
        return (
          <span style={{ color: netProfitColor(net), fontWeight: 600 }}>
            {formatSignedInr(net)}
          </span>
        );
      },
    },
  ];

  const columns: Column<PnPeriodRow>[] = [
    ...periodPrefixColumns,
    ...toggleColumns.map((col) => ({
      key: col.key,
      label: col.label,
      render: (row: PnPeriodRow) => renderToggleCell(col.key, row),
    })),
    ...periodSuffixColumns,
    ...financialColumns,
  ];

  const periodTotals = buildPeriodTotals(data.periodRows, {
    includeExpenses,
    includeReimbursements,
  });

  const renderPeriodTotalCell = (
    column: Column<PnPeriodRow>,
    totals: ReturnType<typeof buildPeriodTotals>,
  ) => {
    switch (column.key) {
      case "period":
        return "Totals";
      case "dollarInward":
        return formatUsd(totals.dollarInwardUsdCents);
      case "onboardingAdvance":
        return formatUsd(totals.onboardingAdvanceUsdCents);
      case "reimbursements":
        return formatUsd(totals.reimbursementUsdCents);
      case "reimbursementLabels":
        return "";
      case "reimbursementsInr":
        return formatInr(totals.reimbursementInrCents);
      case "appraisalAdvance":
        return formatUsd(totals.appraisalAdvanceUsdCents);
      case "appraisalAdvanceInr":
        return formatInr(totals.appraisalAdvanceInrCents);
      case "offboardingDeduction":
        return formatUsd(totals.offboardingDeductionUsdCents);
      case "effectiveDollarInward":
        return formatUsd(totals.effectiveDollarInwardUsdCents);
      case "cashoutRate":
        return formatRate(totals.cashoutUsdInrRate);
      case "cashIn":
        return formatInr(totals.cashInInrCents);
      case "monthlyUsd":
        return formatUsd(totals.employeeMonthlyUsdCents);
      case "paidRate":
        return formatRate(totals.paidUsdInrRate);
      case "pf":
        return formatInr(totals.pfInrCents);
      case "tds":
        return formatInr(totals.tdsInrCents);
      case "actualPaid":
        return formatInr(totals.actualPaidInrCents);
      case "salaryPaid":
        return formatInr(totals.salaryPaidInrCents);
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
          <span style={{ color: netProfitColor(totals.netPlInrCents), fontWeight: 600 }}>
            {formatSignedInr(totals.netPlInrCents)}
          </span>
        );
      default:
        return "-";
    }
  };

  // Custom header rendering to inject checkboxes
  const renderHeader = (column: Column<PnPeriodRow>) => {
    if (column.key === "expenses") {
      return checkboxHeader("Expenses (INR)", includeExpenses, setIncludeExpenses);
    }
    if (column.key === "companyReimbursementUsd") {
      return checkboxHeader("Reimb. (USD)", includeReimbursements, setIncludeReimbursements);
    }
    if (column.key === "companyReimbursementInr") {
      return checkboxHeader("Reimb. (INR)", includeReimbursements, setIncludeReimbursements);
    }
    return column.label;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: includeExpenses ? "#6ee7b7" : "#fca5a5", display: "inline-block" }} />
            Expenses: {includeExpenses ? "in P/L" : "excluded"}
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: includeReimbursements ? "#6ee7b7" : "#fca5a5", display: "inline-block" }} />
            Reimbursements: {includeReimbursements ? "in P/L" : "excluded"}
          </span>
        </div>
        {toggleButton}
      </div>
      <div
        className="overflow-x-auto rounded-2xl"
        style={{ border: "1px solid var(--glass-border)" }}
      >
        <table className="glass-table min-w-max">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{renderHeader(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.periodRows.map((row) => (
              <tr key={`${row.year}-${row.month ?? 0}`}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
            {data.periodRows.length > 0 ? (
              <tr>
                {columns.map((column) => (
                  <td
                    key={`period-total-${column.key}`}
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {renderPeriodTotalCell(column, periodTotals)}
                  </td>
                ))}
              </tr>
            ) : null}
            {data.periodRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center"
                  style={{ color: "var(--text-muted)" }}
                >
                  No period data available for selected filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
