"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { PendingActionButton } from "../_components/pending-action-button";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { inputClass } from "../_components/field";
import type {
  PnDashboardData,
  PnEmployeeEditableRow,
  PnPeriodRow,
  PnPeriodType,
} from "@/src/features/billing/types";
import {
  formatInr,
  formatMonthYear,
  formatSignedInr,
  formatUsd,
} from "@/src/features/billing/utils";
import { getVisibleToggleColumns } from "@/src/features/billing/dashboard-column-visibility";

type DashboardTablesProps = {
  view: "employee" | "period";
  periodType: PnPeriodType;
  data: PnDashboardData;
  selectedCompanyId: string;
  returnTo: string;
  saveDashboardExpenseAction: (formData: FormData) => Promise<void>;
  updateDashboardEmployeeCashFlowEntryAction: (formData: FormData) => Promise<void>;
};

export function DashboardTables({
  view,
  periodType,
  data,
  selectedCompanyId,
  returnTo,
  saveDashboardExpenseAction,
  updateDashboardEmployeeCashFlowEntryAction,
}: DashboardTablesProps) {
  const [showDetails, setShowDetails] = useState(() => {
    const saved = window.localStorage.getItem("dashboardShowDetails");
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
      selectedCompanyId={selectedCompanyId}
      returnTo={returnTo}
      toggleColumns={toggleColumns}
      toggleButton={toggleButton}
      saveDashboardExpenseAction={saveDashboardExpenseAction}
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
                  <td
                    colSpan={Math.max(columns.length - 2, 1)}
                    className="text-right text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Total Net Profit
                  </td>
                  <td
                    className="text-sm font-semibold"
                    style={{ color: netProfitColor(section.totalNetProfitInrCents) }}
                  >
                    {formatSignedInr(section.totalNetProfitInrCents)}
                  </td>
                  <td />
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
  selectedCompanyId: string;
  returnTo: string;
  toggleColumns: ToggleColumn[];
  toggleButton: ReactNode;
  saveDashboardExpenseAction: (formData: FormData) => Promise<void>;
};

function PeriodTables({
  data,
  periodType,
  selectedCompanyId,
  returnTo,
  toggleColumns,
  toggleButton,
  saveDashboardExpenseAction,
}: PeriodTablesProps) {
  const renderToggleCell = (key: ToggleColumn["key"], row: PnPeriodRow) => {
    const details = row as PnPeriodRow & {
      onboardingAdvanceUsdCents?: number;
      reimbursementLabelsText?: string;
      offboardingDeductionUsdCents?: number;
      effectiveDollarInwardUsdCents?: number;
    };
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

  const periodSuffixColumns: Column<PnPeriodRow>[] = [
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
      key: "actualPaid",
      label: "Actual paid (INR)",
      render: (row) => formatInr(row.actualPaidInrCents),
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
      key: "expenses",
      label: "Expenses (INR)",
      render: (row) => (
        <form action={saveDashboardExpenseAction} className="flex items-center gap-2">
          <input type="hidden" name="companyId" value={selectedCompanyId} />
          <input type="hidden" name="periodType" value={periodType} />
          <input type="hidden" name="year" value={row.year} />
          {periodType === "monthly" ? (
            <input type="hidden" name="month" value={row.month} />
          ) : null}
          <input type="hidden" name="returnTo" value={returnTo} />
          <input
            type="number"
            name="amountInr"
            min="0"
            step="0.01"
            defaultValue={(row.expensesInrCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "7rem",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          />
          <PendingSubmitButton
            className="btn-outline"
            defaultText="Save"
            pendingText="Saving..."
          />
        </form>
      ),
    },
    {
      key: "netPl",
      label: "Net P/L (INR)",
      render: (row) => (
        <span style={{ color: netProfitColor(row.netPlInrCents) }}>
          {formatSignedInr(row.netPlInrCents)}
        </span>
      ),
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">{toggleButton}</div>
      <div
        className="overflow-x-auto rounded-2xl"
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
            {data.periodRows.map((row) => (
              <tr key={`${row.year}-${row.month ?? 0}`}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
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
