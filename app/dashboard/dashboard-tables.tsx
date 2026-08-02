"use client";

import { useEffect, useState } from "react";
import { PendingActionButton } from "../_components/pending-action-button";
import { inputClass } from "../_components/field";
import {
  buildEmployeeSectionTotals,
  buildPeriodTotals,
} from "../../src/features/billing/dashboard-table-totals";
import {
  calculatePnEmployeeAdvanceInrCents,
  calculatePnEmployeeNetPlInrCents,
  calculatePnPeriodNetPlInrCents,
} from "../../src/features/billing/pn-dashboard";
import type {
  PnDashboardData,
  PnEmployeeEditableRow,
  PnPeriodRow,
  PnPeriodType,
} from "../../src/features/billing/types";
import {
  formatInr,
  formatMonthYear,
  formatRate,
  formatRateInput,
  formatSignedInr,
  formatUsd,
} from "../../src/features/billing/utils";
import { getVisibleToggleColumns } from "../../src/features/billing/dashboard-column-visibility";
import { buildDashboardExportHref } from "../../src/features/billing/dashboard-export-options";

type DashboardExportHrefs = {
  tableCsv: string;
  tablePdf: string;
  companyCsv: string;
  companyPdf: string;
};

type DashboardTablesProps = {
  view: "employee" | "period";
  periodType: PnPeriodType;
  data: PnDashboardData;
  returnTo: string;
  employeeColumnKeys: string[];
  periodColumnKeys: string[];
  exportHrefs?: DashboardExportHrefs;
  updateDashboardEmployeeCashFlowEntryAction: (formData: FormData) => Promise<void>;
};

const EMPLOYEE_ALWAYS_VISIBLE_COLUMN_KEYS = new Set(["month", "actions"]);
const PERIOD_ALWAYS_VISIBLE_COLUMN_KEYS = new Set(["period"]);

function filterColumns<Row>(
  columns: Column<Row>[],
  selectedColumnKeys: string[],
  alwaysVisibleColumnKeys: Set<string>,
) {
  const selectedColumnKeySet = new Set(selectedColumnKeys);
  return columns.filter(
    (column) =>
      alwaysVisibleColumnKeys.has(column.key) || selectedColumnKeySet.has(column.key),
  );
}

export function DashboardTables({
  view,
  periodType,
  data,
  returnTo,
  employeeColumnKeys,
  periodColumnKeys,
  exportHrefs,
  updateDashboardEmployeeCashFlowEntryAction,
}: DashboardTablesProps) {
  const [includeExpenses, setIncludeExpenses] = useStoredBoolean(
    "dashboardIncludeExpenses",
  );
  const [includeAdvances, setIncludeAdvances] = useStoredBoolean(
    "dashboardIncludeAdvances",
  );
  const [includeReimbursements, setIncludeReimbursements] = useStoredBoolean(
    "dashboardIncludeReimbursements",
  );
  const toggleColumns = getVisibleToggleColumns(true);

  const table =
    view === "employee" ? (
      <EmployeeTables
        data={data}
        returnTo={returnTo}
        selectedColumnKeys={employeeColumnKeys}
        toggleColumns={toggleColumns}
        includeAdvances={includeAdvances}
        setIncludeAdvances={setIncludeAdvances}
        updateDashboardEmployeeCashFlowEntryAction={updateDashboardEmployeeCashFlowEntryAction}
      />
    ) : (
      <PeriodTables
        data={data}
        periodType={periodType}
        selectedColumnKeys={periodColumnKeys}
        toggleColumns={toggleColumns}
        includeExpenses={includeExpenses}
        setIncludeExpenses={setIncludeExpenses}
        includeAdvances={includeAdvances}
        setIncludeAdvances={setIncludeAdvances}
        includeReimbursements={includeReimbursements}
        setIncludeReimbursements={setIncludeReimbursements}
      />
    );

  const exportOptions = {
    includeExpenses,
    includeAdvances,
    includeReimbursements,
  };

  return (
    <div className="space-y-4">
      {exportHrefs ? (
        <div className="flex flex-wrap items-center gap-2">
          <a className="btn-outline" href={buildDashboardExportHref(exportHrefs.tableCsv, exportOptions)}>
            Export CSV
          </a>
          <a className="btn-outline" href={buildDashboardExportHref(exportHrefs.tablePdf, exportOptions)}>
            Export PDF
          </a>
        </div>
      ) : null}
      {table}
    </div>
  );
}

function useStoredBoolean(key: string) {
  const [value, setValue] = useState(true);
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    try {
      setValue(saved === null ? true : Boolean(JSON.parse(saved)));
    } catch {
      setValue(true);
    }
    setStorageLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!storageLoaded) return;
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, storageLoaded, value]);

  return [value, setValue] as const;
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

function accountingCheckboxHeader(input: {
  label: string;
  ariaLabel: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <label
        className="flex cursor-pointer select-none items-center gap-1.5"
        style={{
          fontSize: "0.65rem",
          color: input.checked ? "#6ee7b7" : "var(--text-muted)",
        }}
      >
        <input
          type="checkbox"
          aria-label={input.ariaLabel}
          checked={input.checked}
          onChange={(event) => input.onChange(event.target.checked)}
          style={{ accentColor: "var(--accent-1)", width: 13, height: 13 }}
        />
        In P/L
      </label>
      <span>{input.label}</span>
    </div>
  );
}

type EmployeeTablesProps = {
  data: PnDashboardData;
  returnTo: string;
  selectedColumnKeys: string[];
  toggleColumns: ToggleColumn[];
  includeAdvances: boolean;
  setIncludeAdvances: (value: boolean) => void;
  updateDashboardEmployeeCashFlowEntryAction: (formData: FormData) => Promise<void>;
};

function EmployeeTables({
  data,
  returnTo,
  selectedColumnKeys,
  toggleColumns,
  includeAdvances,
  setIncludeAdvances,
  updateDashboardEmployeeCashFlowEntryAction,
}: EmployeeTablesProps) {
  const renderToggleCell = (key: ToggleColumn["key"], row: PnEmployeeEditableRow) => {
    const formId = `dashboard-payout-${row.payoutId}`;
    if (row.isSalaryOnly) {
      switch (key) {
        case "dollarInward":
          return formatUsd(row.dollarInwardUsdCents);
        case "onboardingAdvance":
          return formatUsd(row.onboardingAdvanceUsdCents);
        case "reimbursements":
          return formatUsd(row.reimbursementUsdCents);
        case "reimbursementLabels":
          return row.reimbursementLabelsText || "-";
        case "appraisalAdvance":
          return formatUsd(row.appraisalAdvanceUsdCents);
        case "offboardingDeduction":
          return formatUsd(row.offboardingDeductionUsdCents);
        case "effectiveDollarInward":
          return formatUsd(row.effectiveDollarInwardUsdCents);
      }
    }
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
      render: (row) => row.isSalaryOnly ? (
        <span>{row.daysWorked} / {row.daysInMonth}</span>
      ) : (
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
      ),
    },
  ];

  const employeeSuffixColumns: Column<PnEmployeeEditableRow>[] = [
    {
      key: "cashoutRate",
      label: "Cashout rate",
      render: (row) => row.isSalaryOnly ? (
        <span style={{ color: "var(--text-muted)" }}>-</span>
      ) : (
        <input
          form={`dashboard-payout-${row.payoutId}`}
          type="number"
          name="cashoutUsdInrRate"
          min="0"
          step="0.01"
          defaultValue={formatRateInput(row.cashoutUsdInrRate)}
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
      label: "Total Cash Inward (INR)",
      render: (row) => formatInr(row.cashInInrCents),
    },
    {
      key: "paidRate",
      label: "Peg rate",
      render: (row) =>
        row.isSalaryOnly ? (
          formatRate(row.paidUsdInrRate)
        ) : row.isSecurityDepositMonth ? (
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
            defaultValue={formatRateInput(row.paidUsdInrRate)}
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
      key: "monthlyPaid",
      label: "Monthly paid (INR)",
      render: (row) => formatInr(row.monthlyPaidInrCents),
    },
    {
      key: "actualPaid",
      label: "Actual paid (INR)",
      render: (row) => row.isSalaryOnly ? (
        formatInr(row.actualPaidInrCents)
      ) : (
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
      key: "salaryPaid",
      label: "Salary paid (INR)",
      render: (row) => formatInr(row.salaryPaidInrCents),
    },
    {
      key: "pf",
      label: "PF (INR)",
      render: (row) => row.isSalaryOnly ? (
        formatInr(row.pfInrCents)
      ) : (
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
      render: (row) => row.isSalaryOnly ? (
        formatInr(row.tdsInrCents)
      ) : (
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
      key: "fxCommission",
      label: "Forex gain (INR)",
      render: (row) => formatInr(row.fxCommissionInrCents),
    },
    {
      key: "commissionEarned",
      label: "Operating margin (INR)",
      render: (row) => formatInr(row.commissionEarnedInrCents),
    },
    {
      key: "grossEarnings",
      label: "Gross P&L (INR)",
      render: (row) => formatInr(row.grossEarningsInrCents),
    },
    {
      key: "advances",
      label: "__custom_advances__",
      render: (row) => formatInr(calculatePnEmployeeAdvanceInrCents(row)),
    },
    {
      key: "netProfit",
      label: "Net P/L (INR)",
      render: (row) => {
        const netPl = calculatePnEmployeeNetPlInrCents(row, { includeAdvances });
        return (
          <span style={{ color: netProfitColor(netPl) }}>
            {formatSignedInr(netPl)}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => row.isSalaryOnly ? (
        <span style={{ color: "var(--text-muted)" }}>Salary only</span>
      ) : (
        <>
          <form
            id={`dashboard-payout-${row.payoutId}`}
            action={updateDashboardEmployeeCashFlowEntryAction}
          >
            <input type="hidden" name="payoutId" value={row.payoutId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="daysWorked" value={row.daysWorked} />
            <input
              type="hidden"
              name="dollarInwardUsd"
              value={(row.dollarInwardUsdCents / 100).toFixed(2)}
            />
            <input
              type="hidden"
              name="onboardingAdvanceUsd"
              value={(row.onboardingAdvanceUsdCents / 100).toFixed(2)}
            />
            <input
              type="hidden"
              name="reimbursementUsd"
              value={(row.reimbursementUsdCents / 100).toFixed(2)}
            />
            <input
              type="hidden"
              name="reimbursementLabelsText"
              value={row.reimbursementLabelsText}
            />
            <input
              type="hidden"
              name="appraisalAdvanceUsd"
              value={(row.appraisalAdvanceUsdCents / 100).toFixed(2)}
            />
            <input
              type="hidden"
              name="offboardingDeductionUsd"
              value={(row.offboardingDeductionUsdCents / 100).toFixed(2)}
            />
            <input
              type="hidden"
              name="cashoutUsdInrRate"
              value={formatRateInput(row.cashoutUsdInrRate)}
            />
            <input
              type="hidden"
              name="paidUsdInrRate"
              value={formatRateInput(row.paidUsdInrRate)}
            />
            <input
              type="hidden"
              name="pfInr"
              value={(row.pfInrCents / 100).toFixed(2)}
            />
            <input
              type="hidden"
              name="tdsInr"
              value={(row.tdsInrCents / 100).toFixed(2)}
            />
            <input
              type="hidden"
              name="actualPaidInr"
              value={(row.actualPaidInrCents / 100).toFixed(2)}
            />
          </form>
          <PendingActionButton
            form={`dashboard-payout-${row.payoutId}`}
            className="btn-outline"
            defaultText="Update"
            pendingText="Updating..."
          />
        </>
      ),
    },
  ];

  const allColumns: Column<PnEmployeeEditableRow>[] = [
    ...employeePrefixColumns,
    ...toggleColumns.map((col) => ({
      key: col.key,
      label: col.label,
      render: (row: PnEmployeeEditableRow) => renderToggleCell(col.key, row),
    })),
    ...employeeSuffixColumns,
  ];
  const columns = filterColumns(
    allColumns,
    selectedColumnKeys,
    EMPLOYEE_ALWAYS_VISIBLE_COLUMN_KEYS,
  );

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
      case "paidRate":
        return formatRate(totals.paidUsdInrRate);
      case "monthlyPaid":
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
      case "commissionEarned":
        return formatInr(totals.commissionEarnedInrCents);
      case "grossEarnings":
        return formatInr(totals.grossEarningsInrCents);
      case "advances":
        return formatInr(totals.advancesInrCents);
      case "netProfit": {
        const netPl = includeAdvances
          ? totals.netPlInrCents
          : totals.netPlBeforeAdvancesInrCents;
        return (
          <span style={{ color: netProfitColor(netPl) }}>
            {formatSignedInr(netPl)}
          </span>
        );
      }
      case "actions":
        return "";
      default:
        return "-";
    }
  };

  const renderEmployeeHeader = (column: Column<PnEmployeeEditableRow>) =>
    column.key === "advances"
      ? accountingCheckboxHeader({
          label: "Advances (INR)",
          ariaLabel: "Include advances in Net P/L",
          checked: includeAdvances,
          onChange: setIncludeAdvances,
        })
      : column.label;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: includeAdvances ? "#6ee7b7" : "#fca5a5",
            display: "inline-block",
          }}
        />
        Advances: {includeAdvances ? "in P/L" : "excluded"}
      </div>
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
                    <th key={column.key}>{renderEmployeeHeader(column)}</th>
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
  selectedColumnKeys: string[];
  toggleColumns: ToggleColumn[];
  includeExpenses: boolean;
  setIncludeExpenses: (value: boolean) => void;
  includeAdvances: boolean;
  setIncludeAdvances: (value: boolean) => void;
  includeReimbursements: boolean;
  setIncludeReimbursements: (value: boolean) => void;
};

function PeriodTables({
  data,
  periodType,
  selectedColumnKeys,
  toggleColumns,
  includeExpenses,
  setIncludeExpenses,
  includeAdvances,
  setIncludeAdvances,
  includeReimbursements,
  setIncludeReimbursements,
}: PeriodTablesProps) {
  const computeNetPl = (row: PnPeriodRow) => {
    return calculatePnPeriodNetPlInrCents(row, {
      includeExpenses,
      includeAdvances,
      includeReimbursements,
    });
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

  const periodSuffixColumns: Column<PnPeriodRow>[] = [
    {
      key: "cashoutRate",
      label: "Cashout rate",
      render: (row) => formatRate(row.cashoutUsdInrRate),
    },
    {
      key: "cashIn",
      label: "Total Cash Inward (INR)",
      render: (row) => formatInr(row.cashInInrCents),
    },
    {
      key: "paidRate",
      label: "Peg rate",
      render: (row) => formatRate(row.paidUsdInrRate),
    },
    {
      key: "monthlyPaid",
      label: "Monthly paid (INR)",
      render: (row) => formatInr(row.monthlyPaidInrCents),
    },
    {
      key: "actualPaid",
      label: "Actual paid (INR)",
      render: (row) => formatInr(row.actualPaidInrCents),
    },
    {
      key: "salaryPaid",
      label: "Salary paid (INR)",
      render: (row) => formatInr(row.salaryPaidInrCents),
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
      key: "fxCommission",
      label: "Forex gain (INR)",
      render: (row) => formatInr(row.fxCommissionInrCents),
    },
    {
      key: "commissionEarned",
      label: "Operating margin (INR)",
      render: (row) => formatInr(row.commissionEarnedInrCents),
    },
    {
      key: "grossEarnings",
      label: "Gross P&L (INR)",
      render: (row) => formatInr(row.grossEarningsInrCents),
    },
  ];

  // Expense, reimbursement, and net P/L columns keep their header controls when selected.
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
      key: "advances",
      label: "__custom_advances__",
      render: (row) => (
        <span style={{ color: row.advancesInrCents > 0 ? "#fca5a5" : "var(--text-primary)" }}>
          {formatInr(row.advancesInrCents)}
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

  const allColumns: Column<PnPeriodRow>[] = [
    ...periodPrefixColumns,
    ...toggleColumns.map((col) => ({
      key: col.key,
      label: col.label,
      render: (row: PnPeriodRow) => renderToggleCell(col.key, row),
    })),
    ...periodSuffixColumns,
    ...financialColumns,
  ];
  const columns = filterColumns(
    allColumns,
    selectedColumnKeys,
    PERIOD_ALWAYS_VISIBLE_COLUMN_KEYS,
  );

  const periodTotals = buildPeriodTotals(data.periodRows, {
    includeExpenses,
    includeAdvances,
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
      case "paidRate":
        return formatRate(totals.paidUsdInrRate);
      case "monthlyPaid":
        return formatInr(totals.monthlyPaidInrCents);
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
      case "commissionEarned":
        return formatInr(totals.commissionEarnedInrCents);
      case "grossEarnings":
        return formatInr(totals.grossEarningsInrCents);
      case "expenses":
        return formatInr(totals.expensesInrCents);
      case "advances":
        return formatInr(totals.advancesInrCents);
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
      return accountingCheckboxHeader({
        label: "Expenses (INR)",
        ariaLabel: "Include expenses in Net P/L",
        checked: includeExpenses,
        onChange: setIncludeExpenses,
      });
    }
    if (column.key === "advances") {
      return accountingCheckboxHeader({
        label: "Advances (INR)",
        ariaLabel: "Include advances in Net P/L",
        checked: includeAdvances,
        onChange: setIncludeAdvances,
      });
    }
    if (column.key === "companyReimbursementUsd") {
      return accountingCheckboxHeader({
        label: "Reimb. (USD)",
        ariaLabel: "Include reimbursements in Net P/L",
        checked: includeReimbursements,
        onChange: setIncludeReimbursements,
      });
    }
    if (column.key === "companyReimbursementInr") {
      return accountingCheckboxHeader({
        label: "Reimb. (INR)",
        ariaLabel: "Include reimbursements in Net P/L",
        checked: includeReimbursements,
        onChange: setIncludeReimbursements,
      });
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
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: includeAdvances ? "#6ee7b7" : "#fca5a5", display: "inline-block" }} />
            Advances: {includeAdvances ? "in P/L" : "excluded"}
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: includeReimbursements ? "#6ee7b7" : "#fca5a5", display: "inline-block" }} />
            Reimbursements: {includeReimbursements ? "in P/L" : "excluded"}
          </span>
        </div>
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
