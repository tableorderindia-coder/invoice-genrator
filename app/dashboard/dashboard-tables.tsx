"use client";

import {
  Fragment,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import { PendingActionButton } from "../_components/pending-action-button";
import { inputClass } from "../_components/field";
import { NumericInput } from "../_components/numeric-input";
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
  CompanyExpense,
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
import type { PortalUiMode } from "../../src/features/ui/portal-ui-mode";
import type {
  DashboardBulkUpdateResult,
  DashboardBulkUpdateRowInput,
} from "../../src/features/billing/types";
import { UnifiedEmployeeTable } from "./unified-employee-table";

type DashboardExportHrefs = {
  tableCsv: string;
  tablePdf: string;
  companyCsv: string;
  companyPdf: string;
};

type DashboardCompanyBreakdown = {
  companyId: string;
  companyName: string;
  data: PnDashboardData;
  expenses?: CompanyExpense[];
};

type DashboardTablesProps = {
  view: "employee" | "period";
  periodType: PnPeriodType;
  data: PnDashboardData;
  companyBreakdowns?: DashboardCompanyBreakdown[];
  returnTo: string;
  employeeColumnKeys: string[];
  periodColumnKeys: string[];
  exportHrefs?: DashboardExportHrefs;
  uiMode?: PortalUiMode;
  updateDashboardEmployeeCashFlowEntryAction: (formData: FormData) => Promise<void>;
  bulkUpdateDashboardEmployeeCashFlowEntriesAction?: (
    rows: DashboardBulkUpdateRowInput[],
  ) => Promise<DashboardBulkUpdateResult>;
};

const PERIOD_BREAKDOWN_COLUMN_KEY = "breakdown";
const EMPLOYEE_ALWAYS_VISIBLE_COLUMN_KEYS = new Set(["month", "actions"]);
const PERIOD_ALWAYS_VISIBLE_COLUMN_KEYS = new Set([
  PERIOD_BREAKDOWN_COLUMN_KEY,
  "period",
]);

function filterColumns<TColumn extends { key: string }>(
  columns: TColumn[],
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
  companyBreakdowns = [],
  returnTo,
  employeeColumnKeys,
  periodColumnKeys,
  exportHrefs,
  uiMode = "legacy",
  updateDashboardEmployeeCashFlowEntryAction,
  bulkUpdateDashboardEmployeeCashFlowEntriesAction,
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
    view === "employee" && uiMode === "saas" && bulkUpdateDashboardEmployeeCashFlowEntriesAction ? (
      <UnifiedEmployeeTable
        data={data}
        selectedColumnKeys={employeeColumnKeys}
        includeAdvances={includeAdvances}
        setIncludeAdvances={setIncludeAdvances}
        exportHrefs={exportHrefs}
        bulkUpdateAction={bulkUpdateDashboardEmployeeCashFlowEntriesAction}
      />
    ) : view === "employee" ? (
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
        companyBreakdowns={companyBreakdowns}
        periodType={periodType}
        selectedColumnKeys={periodColumnKeys}
        toggleColumns={toggleColumns}
        includeExpenses={includeExpenses}
        setIncludeExpenses={setIncludeExpenses}
        includeAdvances={includeAdvances}
        setIncludeAdvances={setIncludeAdvances}
        includeReimbursements={includeReimbursements}
        setIncludeReimbursements={setIncludeReimbursements}
        uiMode={uiMode}
      />
    );

  const exportOptions = {
    includeExpenses,
    includeAdvances,
    includeReimbursements,
  };

  return (
    <div className="space-y-4">
      {exportHrefs && !(view === "employee" && uiMode === "saas") ? (
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
  const eventName = `eassyonboard:storage:${key}`;
  const subscribe = useCallback((callback: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) callback();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(eventName, callback);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(eventName, callback);
    };
  }, [eventName, key]);
  const getSnapshot = useCallback(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? true : Boolean(JSON.parse(saved));
    } catch {
      return true;
    }
  }, [key]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => true);
  const setValue = useCallback((next: boolean) => {
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event(eventName));
  }, [eventName, key]);
  return [value, setValue] as const;
}

type ToggleColumn = ReturnType<typeof getVisibleToggleColumns>[number];

type Column<Row> = {
  key: string;
  label: string;
  render: (row: Row) => React.ReactNode;
};

type PeriodValueKind = "usd" | "inr" | "signedInr" | "rate" | "text";

type PeriodColumn<Row> = Column<Row> & {
  valueKind?: PeriodValueKind;
  getValue?: (row: Row) => number | string | null | undefined;
};

type PeriodDetailSource = {
  id: string;
  label: string;
  value: number | string | null | undefined;
  children?: PeriodDetailSource[];
};

function periodRowKey(row: Pick<PnPeriodRow, "year" | "month" | "fiscalLabel">) {
  return row.fiscalLabel ?? `${row.year}-${String(row.month ?? 0).padStart(2, "0")}`;
}

function rowMatchesPeriod(
  source: Pick<PnEmployeeEditableRow, "year" | "month">,
  period: PnPeriodRow,
  periodType: PnPeriodType,
) {
  if (periodType === "monthly") {
    return source.year === period.year && source.month === period.month;
  }
  const fiscalStartYear = source.month >= 4 ? source.year : source.year - 1;
  return fiscalStartYear === period.year;
}

function expenseMatchesPeriod(
  expense: Pick<CompanyExpense, "year" | "month">,
  period: PnPeriodRow,
  periodType: PnPeriodType,
) {
  if (periodType === "monthly") {
    return expense.year === period.year && expense.month === period.month;
  }
  const fiscalStartYear = expense.month >= 4 ? expense.year : expense.year - 1;
  return fiscalStartYear === period.year;
}

function periodLabel(row: PnPeriodRow, periodType: PnPeriodType) {
  return periodType === "monthly"
    ? formatMonthYear(row.month ?? 1, row.year)
    : row.fiscalLabel ?? String(row.year);
}

function formatPeriodBreakdownValue(
  value: number | string | null | undefined,
  valueKind: PeriodValueKind | undefined,
) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;
  switch (valueKind) {
    case "usd":
      return formatUsd(value);
    case "inr":
      return formatInr(value);
    case "signedInr":
      return formatSignedInr(value);
    case "rate":
      return formatRate(value);
    default:
      return String(value);
  }
}

function isContributingValue(value: number | string | null | undefined) {
  if (typeof value === "number") return value > 0;
  return Boolean(value);
}

function periodColumnDisplayLabel(column: Pick<PeriodColumn<PnPeriodRow>, "key" | "label">) {
  switch (column.key) {
    case "expenses":
      return "Expenses (INR)";
    case "advances":
      return "Advances (INR)";
    case "companyReimbursementUsd":
      return "Reimb. (USD)";
    case "companyReimbursementInr":
      return "Reimb. (INR)";
    default:
      return column.label;
  }
}

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
          <NumericInput
            form={formId}
            name="dollarInwardUsd"
            min="0"
            precision={2}
            defaultValue={(row.dollarInwardUsdCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "8rem",
              border: "1px solid var(--glass-border)",
              background: "var(--control-bg)",
              color: "var(--text-primary)",
            }}
          />
        );
      case "onboardingAdvance":
        return (
          <NumericInput
            form={formId}
            name="onboardingAdvanceUsd"
            min="0"
            precision={2}
            defaultValue={(row.onboardingAdvanceUsdCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "8rem",
              border: "1px solid var(--glass-border)",
              background: "var(--control-bg)",
              color: "var(--text-primary)",
            }}
          />
        );
      case "reimbursements":
        return (
          <NumericInput
            form={formId}
            name="reimbursementUsd"
            min="0"
            precision={2}
            defaultValue={(row.reimbursementUsdCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "8rem",
              border: "1px solid var(--glass-border)",
              background: "var(--control-bg)",
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
              background: "var(--control-bg)",
              color: "var(--text-primary)",
            }}
          />
        );
      case "reimbursementsInr":
        return formatInr(row.reimbursementInrCents);
      case "appraisalAdvance":
        return (
          <NumericInput
            form={formId}
            name="appraisalAdvanceUsd"
            min="0"
            precision={2}
            defaultValue={(row.appraisalAdvanceUsdCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "8rem",
              border: "1px solid var(--glass-border)",
              background: "var(--control-bg)",
              color: "var(--text-primary)",
            }}
          />
        );
      case "appraisalAdvanceInr":
        return formatInr(row.appraisalAdvanceInrCents);
      case "offboardingDeduction":
        return (
          <NumericInput
            form={formId}
            name="offboardingDeductionUsd"
            min="0"
            precision={2}
            defaultValue={(row.offboardingDeductionUsdCents / 100).toFixed(2)}
            className={inputClass}
            style={{
              minWidth: "8rem",
              border: "1px solid var(--glass-border)",
              background: "var(--control-bg)",
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
          <NumericInput
            form={`dashboard-payout-${row.payoutId}`}
            name="daysWorked"
            min="1"
            precision={0}
            defaultValue={row.daysWorked}
            className={inputClass}
            style={{
              minWidth: "6rem",
              border: "1px solid var(--glass-border)",
              background: "var(--control-bg)",
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
        <NumericInput
          form={`dashboard-payout-${row.payoutId}`}
          name="cashoutUsdInrRate"
          min="0"
          precision={2}
          defaultValue={formatRateInput(row.cashoutUsdInrRate)}
          className={inputClass}
          style={{
            minWidth: "7rem",
            border: "1px solid var(--glass-border)",
            background: "var(--control-bg)",
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
          <NumericInput
            form={`dashboard-payout-${row.payoutId}`}
            name="paidUsdInrRate"
            min="0"
            precision={4}
            defaultValue={formatRateInput(row.paidUsdInrRate)}
            className={inputClass}
            style={{
              minWidth: "7rem",
              border: "1px solid var(--glass-border)",
              background: "var(--control-bg)",
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
        <NumericInput
          form={`dashboard-payout-${row.payoutId}`}
          name="actualPaidInr"
          min="0"
          precision={2}
          defaultValue={(row.actualPaidInrCents / 100).toFixed(2)}
          className={inputClass}
          style={{
            minWidth: "8rem",
            border: "1px solid var(--glass-border)",
            background: "var(--control-bg)",
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
        <NumericInput
          form={`dashboard-payout-${row.payoutId}`}
          name="pfInr"
          min="0"
          precision={2}
          defaultValue={(row.pfInrCents / 100).toFixed(2)}
          className={inputClass}
          style={{
            minWidth: "8rem",
            border: "1px solid var(--glass-border)",
            background: "var(--control-bg)",
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
        <NumericInput
          form={`dashboard-payout-${row.payoutId}`}
          name="tdsInr"
          min="0"
          precision={2}
          defaultValue={(row.tdsInrCents / 100).toFixed(2)}
          className={inputClass}
          style={{
            minWidth: "8rem",
            border: "1px solid var(--glass-border)",
            background: "var(--control-bg)",
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
      render: (row) => row.isSalaryOnly ? (
        formatInr(calculatePnEmployeeAdvanceInrCents(row))
      ) : (
        <NumericInput
          form={`dashboard-payout-${row.payoutId}`}
          name="advanceOverrideInr"
          aria-label={`Advance INR override for ${formatMonthYear(row.month, row.year)}`}
          min="0"
          precision={2}
          defaultValue={
            row.advanceOverrideInrCents == null
              ? ""
              : row.advanceOverrideInrCents / 100
          }
          placeholder={`Auto: ${calculatePnEmployeeAdvanceInrCents(row) / 100}`}
          className={inputClass}
          style={{
            minWidth: "8rem",
            border: "1px solid var(--glass-border)",
            background: "var(--control-bg)",
            color: "var(--text-primary)",
          }}
        />
      ),
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
            data-unsaved-form
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
            background: "var(--surface-subtle)",
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
  companyBreakdowns: DashboardCompanyBreakdown[];
  periodType: PnPeriodType;
  selectedColumnKeys: string[];
  toggleColumns: ToggleColumn[];
  includeExpenses: boolean;
  setIncludeExpenses: (value: boolean) => void;
  includeAdvances: boolean;
  setIncludeAdvances: (value: boolean) => void;
  includeReimbursements: boolean;
  setIncludeReimbursements: (value: boolean) => void;
  uiMode: PortalUiMode;
};

function PeriodTables({
  data,
  companyBreakdowns,
  periodType,
  selectedColumnKeys,
  toggleColumns,
  includeExpenses,
  setIncludeExpenses,
  includeAdvances,
  setIncludeAdvances,
  includeReimbursements,
  setIncludeReimbursements,
  uiMode,
}: PeriodTablesProps) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(() => new Set());
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(() => new Set());
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(() => new Set());

  const toggleSetValue = (
    setValue: Dispatch<SetStateAction<Set<string>>>,
    key: string,
  ) => {
    setValue((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const computeNetPl = (row: PnPeriodRow) => {
    return calculatePnPeriodNetPlInrCents(row, {
      includeExpenses,
      includeAdvances,
      includeReimbursements,
    });
  };

  const companyBreakdownsByPeriod = useMemo(() => {
    const grouped = new Map<
      string,
      Array<DashboardCompanyBreakdown & { periodRow: PnPeriodRow }>
    >();
    for (const company of companyBreakdowns) {
      for (const periodRow of company.data.periodRows) {
        const key = periodRowKey(periodRow);
        const existing = grouped.get(key) ?? [];
        existing.push({ ...company, periodRow });
        grouped.set(key, existing);
      }
    }
    return grouped;
  }, [companyBreakdowns]);

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

  const periodPrefixColumns: PeriodColumn<PnPeriodRow>[] = [
    {
      key: PERIOD_BREAKDOWN_COLUMN_KEY,
      label: "",
      render: (row) => {
        const key = periodRowKey(row);
        const isExpanded = expandedPeriods.has(key);
        const companyCount = companyBreakdownsByPeriod.get(key)?.length ?? 0;
        return (
          <button
            type="button"
            className="btn-outline"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} period ${periodLabel(row, periodType)}`}
            aria-expanded={isExpanded}
            disabled={companyCount === 0}
            onClick={() => toggleSetValue(setExpandedPeriods, key)}
            style={{
              minWidth: "2rem",
              padding: "0.2rem 0.45rem",
              opacity: companyCount === 0 ? 0.45 : 1,
            }}
          >
            {isExpanded ? "-" : "+"}
          </button>
        );
      },
    },
    {
      key: "period",
      label: "Period",
      render: (row) =>
        periodType === "monthly"
          ? formatMonthYear(row.month ?? 1, row.year)
          : row.fiscalLabel ?? String(row.year),
      valueKind: "text",
      getValue: (row) => periodLabel(row, periodType),
    },
  ];

  const periodSuffixColumns: PeriodColumn<PnPeriodRow>[] = [
    {
      key: "cashoutRate",
      label: "Cashout rate",
      render: (row) => formatRate(row.cashoutUsdInrRate),
      valueKind: "rate",
      getValue: (row) => row.cashoutUsdInrRate,
    },
    {
      key: "cashIn",
      label: "Total Cash Inward (INR)",
      render: (row) => formatInr(row.cashInInrCents),
      valueKind: "inr",
      getValue: (row) => row.cashInInrCents,
    },
    {
      key: "paidRate",
      label: "Peg rate",
      render: (row) => formatRate(row.paidUsdInrRate),
      valueKind: "rate",
      getValue: (row) => row.paidUsdInrRate,
    },
    {
      key: "monthlyPaid",
      label: "Monthly paid (INR)",
      render: (row) => formatInr(row.monthlyPaidInrCents),
      valueKind: "inr",
      getValue: (row) => row.monthlyPaidInrCents,
    },
    {
      key: "actualPaid",
      label: "Actual paid (INR)",
      render: (row) => formatInr(row.actualPaidInrCents),
      valueKind: "inr",
      getValue: (row) => row.actualPaidInrCents,
    },
    {
      key: "salaryPaid",
      label: "Salary paid (INR)",
      render: (row) => formatInr(row.salaryPaidInrCents),
      valueKind: "inr",
      getValue: (row) => row.salaryPaidInrCents,
    },
    {
      key: "pf",
      label: "PF (INR)",
      render: (row) => formatInr(row.pfInrCents),
      valueKind: "inr",
      getValue: (row) => row.pfInrCents,
    },
    {
      key: "tds",
      label: "TDS (INR)",
      render: (row) => formatInr(row.tdsInrCents),
      valueKind: "inr",
      getValue: (row) => row.tdsInrCents,
    },
    {
      key: "fxCommission",
      label: "Forex gain (INR)",
      render: (row) => formatInr(row.fxCommissionInrCents),
      valueKind: "inr",
      getValue: (row) => row.fxCommissionInrCents,
    },
    {
      key: "commissionEarned",
      label: "Operating margin (INR)",
      render: (row) => formatInr(row.commissionEarnedInrCents),
      valueKind: "inr",
      getValue: (row) => row.commissionEarnedInrCents,
    },
    {
      key: "grossEarnings",
      label: "Gross P&L (INR)",
      render: (row) => formatInr(row.grossEarningsInrCents),
      valueKind: "inr",
      getValue: (row) => row.grossEarningsInrCents,
    },
  ];

  // Expense, reimbursement, and net P/L columns keep their header controls when selected.
  const financialColumns: PeriodColumn<PnPeriodRow>[] = [
    {
      key: "expenses",
      label: "__custom_expenses__",
      render: (row) => (
        <span style={{ color: row.expensesInrCents > 0 ? "#fca5a5" : "var(--text-primary)" }}>
          {formatInr(row.expensesInrCents)}
        </span>
      ),
      valueKind: "inr",
      getValue: (row) => row.expensesInrCents,
    },
    {
      key: "advances",
      label: "__custom_advances__",
      render: (row) => (
        <span style={{ color: row.advancesInrCents > 0 ? "#fca5a5" : "var(--text-primary)" }}>
          {formatInr(row.advancesInrCents)}
        </span>
      ),
      valueKind: "inr",
      getValue: (row) => row.advancesInrCents,
    },
    {
      key: "companyReimbursementUsd",
      label: "__custom_reimbursement_usd__",
      render: (row) => formatUsd(row.companyReimbursementUsdCents),
      valueKind: "usd",
      getValue: (row) => row.companyReimbursementUsdCents,
    },
    {
      key: "companyReimbursementInr",
      label: "__custom_reimbursement_inr__",
      render: (row) => (
        <span style={{ color: row.companyReimbursementInrCents > 0 ? "#6ee7b7" : "var(--text-primary)" }}>
          {formatInr(row.companyReimbursementInrCents)}
        </span>
      ),
      valueKind: "inr",
      getValue: (row) => row.companyReimbursementInrCents,
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
      valueKind: "signedInr",
      getValue: (row) => computeNetPl(row),
    },
  ];

  const allColumns: PeriodColumn<PnPeriodRow>[] = [
    ...periodPrefixColumns,
    ...toggleColumns.map((col): PeriodColumn<PnPeriodRow> => ({
      key: col.key,
      label: col.label,
      render: (row: PnPeriodRow) => renderToggleCell(col.key, row),
      valueKind:
        col.key === "reimbursementLabels"
          ? "text"
          : col.key === "reimbursementsInr" || col.key === "appraisalAdvanceInr"
            ? "inr"
            : "usd",
      getValue: (row: PnPeriodRow) => {
        switch (col.key) {
          case "dollarInward":
            return row.dollarInwardUsdCents;
          case "onboardingAdvance":
            return row.onboardingAdvanceUsdCents;
          case "reimbursements":
            return row.reimbursementUsdCents;
          case "reimbursementLabels":
            return row.reimbursementLabelsText;
          case "reimbursementsInr":
            return row.reimbursementInrCents;
          case "appraisalAdvance":
            return row.appraisalAdvanceUsdCents;
          case "appraisalAdvanceInr":
            return row.appraisalAdvanceInrCents;
          case "offboardingDeduction":
            return row.offboardingDeductionUsdCents;
          case "effectiveDollarInward":
            return row.effectiveDollarInwardUsdCents;
          default:
            return null;
        }
      },
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

  const getEmployeeSourceValue = (
    row: PnEmployeeEditableRow,
    columnKey: string,
  ): number | string | null => {
    switch (columnKey) {
      case "dollarInward":
        return row.dollarInwardUsdCents;
      case "onboardingAdvance":
        return row.onboardingAdvanceUsdCents;
      case "reimbursements":
        return row.reimbursementUsdCents;
      case "reimbursementLabels":
        return row.reimbursementLabelsText;
      case "reimbursementsInr":
        return row.reimbursementInrCents;
      case "appraisalAdvance":
        return row.appraisalAdvanceUsdCents;
      case "appraisalAdvanceInr":
        return row.appraisalAdvanceInrCents;
      case "offboardingDeduction":
        return row.offboardingDeductionUsdCents;
      case "effectiveDollarInward":
        return row.effectiveDollarInwardUsdCents;
      case "cashoutRate":
        return row.cashoutUsdInrRate;
      case "cashIn":
        return row.cashInInrCents;
      case "paidRate":
        return row.paidUsdInrRate;
      case "monthlyPaid":
        return row.monthlyPaidInrCents;
      case "actualPaid":
        return row.actualPaidInrCents;
      case "salaryPaid":
        return row.salaryPaidInrCents;
      case "pf":
        return row.pfInrCents;
      case "tds":
        return row.tdsInrCents;
      case "fxCommission":
        return row.fxCommissionInrCents;
      case "commissionEarned":
        return row.commissionEarnedInrCents;
      case "grossEarnings":
        return row.grossEarningsInrCents;
      case "advances":
        return calculatePnEmployeeAdvanceInrCents(row);
      case "netPl":
        return calculatePnEmployeeNetPlInrCents(row, { includeAdvances });
      default:
        return null;
    }
  };

  const getColumnSources = (
    company: DashboardCompanyBreakdown,
    periodRow: PnPeriodRow,
    column: PeriodColumn<PnPeriodRow>,
  ): PeriodDetailSource[] => {
    const employeeRows = company.data.employeeEditableSections.flatMap((section) =>
      section.rows
        .filter((row) => rowMatchesPeriod(row, periodRow, periodType))
        .map((row) => ({
          sectionName: section.employeeName,
          row,
        })),
    );
    const employeeSources = employeeRows
      .map(({ sectionName, row }) => ({
        id: `${row.payoutId}:${column.key}`,
        label: `${sectionName} - ${row.invoiceNumber || "Salary only"} - ${formatMonthYear(row.month, row.year)}`,
        value: getEmployeeSourceValue(row, column.key),
      }))
      .filter((source) => isContributingValue(source.value));

    if (column.key === "expenses") {
      const matchingExpenses = (company.expenses ?? []).filter((expense) =>
        expenseMatchesPeriod(expense, periodRow, periodType),
      );
      const byLabel = new Map<string, CompanyExpense[]>();
      for (const expense of matchingExpenses) {
        const label = expense.label || "(No label)";
        byLabel.set(label, [...(byLabel.get(label) ?? []), expense]);
      }
      return [...byLabel.entries()]
        .map(([label, expenses]) => ({
          id: `${company.companyId}:expenses:${label}`,
          label,
          value: expenses.reduce((sum, expense) => sum + expense.amountInrCents, 0),
          children: expenses
            .slice()
            .sort((left, right) => left.year * 100 + left.month - (right.year * 100 + right.month))
            .map((expense) => ({
              id: expense.id,
              label: formatMonthYear(expense.month, expense.year),
              value: expense.amountInrCents,
            })),
        }))
        .filter((source) => isContributingValue(source.value))
        .sort((left, right) => Number(right.value) - Number(left.value));
    }

    if (column.key === "advances") {
      const byEmployee = new Map<
        string,
        Array<{ sectionName: string; row: PnEmployeeEditableRow; value: number }>
      >();
      for (const source of employeeRows) {
        const value = calculatePnEmployeeAdvanceInrCents(source.row);
        if (!isContributingValue(value)) continue;
        byEmployee.set(source.sectionName, [
          ...(byEmployee.get(source.sectionName) ?? []),
          { ...source, value },
        ]);
      }
      return [...byEmployee.entries()]
        .map(([employeeName, rows]) => ({
          id: `${company.companyId}:advances:${employeeName}`,
          label: employeeName,
          value: rows.reduce((sum, item) => sum + item.value, 0),
          children: rows.map(({ row, value }) => ({
            id: `${row.payoutId}:advance`,
            label: `${row.invoiceNumber || "Salary only"} - ${formatMonthYear(row.month, row.year)}`,
            value,
          })),
        }))
        .sort((left, right) => Number(right.value) - Number(left.value));
    }

    if (column.key === "companyReimbursementUsd") {
      return isContributingValue(periodRow.companyReimbursementUsdCents)
        ? [
            {
              id: `${company.companyId}:companyReimbursementUsd`,
              label: `${company.companyName} company reimbursement`,
              value: periodRow.companyReimbursementUsdCents,
            },
          ]
        : [];
    }

    if (column.key === "companyReimbursementInr") {
      return isContributingValue(periodRow.companyReimbursementInrCents)
        ? [
            {
              id: `${company.companyId}:companyReimbursementInr`,
              label: `${company.companyName} company reimbursement`,
              value: periodRow.companyReimbursementInrCents,
            },
          ]
        : [];
    }

    if (column.key === "reimbursements") {
      const companySource = isContributingValue(periodRow.companyReimbursementUsdCents)
        ? [
            {
              id: `${company.companyId}:companyReimbursementUsd`,
              label: `${company.companyName} company reimbursement`,
              value: periodRow.companyReimbursementUsdCents,
            },
          ]
        : [];
      return [...employeeSources, ...companySource];
    }

    if (column.key === "reimbursementsInr") {
      const companySource = isContributingValue(periodRow.companyReimbursementInrCents)
        ? [
            {
              id: `${company.companyId}:companyReimbursementInr`,
              label: `${company.companyName} company reimbursement`,
              value: periodRow.companyReimbursementInrCents,
            },
          ]
        : [];
      return [...employeeSources, ...companySource];
    }

    return employeeSources;
  };

  const renderCompanyCell = (
    company: DashboardCompanyBreakdown & { periodRow: PnPeriodRow },
    periodRow: PnPeriodRow,
    column: PeriodColumn<PnPeriodRow>,
  ) => {
    const companyKey = `${periodRowKey(periodRow)}:${company.companyId}`;
    const isExpanded = expandedCompanies.has(companyKey);
    if (column.key === PERIOD_BREAKDOWN_COLUMN_KEY) {
      return (
        <button
          type="button"
          className="btn-outline"
          aria-label={`${isExpanded ? "Collapse" : "Expand"} company ${company.companyName}`}
          aria-expanded={isExpanded}
          onClick={() => toggleSetValue(setExpandedCompanies, companyKey)}
          style={{ minWidth: "2rem", padding: "0.2rem 0.45rem" }}
        >
          {isExpanded ? "-" : "+"}
        </button>
      );
    }
    if (column.key === "period") {
      return (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {company.companyName}
        </span>
      );
    }
    return column.render(company.periodRow);
  };

  const renderColumnBreakdownCell = (
    company: DashboardCompanyBreakdown & { periodRow: PnPeriodRow },
    periodRow: PnPeriodRow,
    column: PeriodColumn<PnPeriodRow>,
  ) => {
    if (column.key === PERIOD_BREAKDOWN_COLUMN_KEY) return "";
    if (column.key === "period") {
      return (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Column breakdown
        </span>
      );
    }
    const value = column.getValue?.(company.periodRow);
    const sources = getColumnSources(company, periodRow, column);
    const columnKey = `${periodRowKey(periodRow)}:${company.companyId}:${column.key}`;
    const isExpanded = expandedColumns.has(columnKey);
    const displayLabel = periodColumnDisplayLabel(column);
    if (!isContributingValue(value) || sources.length === 0) {
      return <span style={{ color: "var(--text-muted)" }}>-</span>;
    }
    return (
      <div className="space-y-2">
        <button
          type="button"
          className="btn-outline"
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${displayLabel} breakdown for ${company.companyName}`}
          aria-expanded={isExpanded}
          onClick={() => toggleSetValue(setExpandedColumns, columnKey)}
          style={{ minWidth: "2rem", padding: "0.2rem 0.45rem" }}
        >
          {isExpanded ? "-" : "+"}
        </button>
        {isExpanded ? (
          <div
            className="min-w-56 space-y-1 rounded-lg p-2 text-xs"
            style={{
              border: "1px solid var(--glass-border)",
              background: "var(--surface-subtle)",
              color: "var(--text-primary)",
            }}
          >
            {sources.map((source) => (
              <div key={source.id} className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-1.5">
                    {source.children?.length ? (
                      <button
                        type="button"
                        className="btn-outline"
                        aria-label={`${expandedColumns.has(`${columnKey}:source:${source.id}`) ? "Collapse" : "Expand"} ${source.label}`}
                        aria-expanded={expandedColumns.has(`${columnKey}:source:${source.id}`)}
                        onClick={() =>
                          toggleSetValue(
                            setExpandedColumns,
                            `${columnKey}:source:${source.id}`,
                          )
                        }
                        style={{
                          minWidth: "1.3rem",
                          padding: "0.05rem 0.25rem",
                          fontSize: "0.7rem",
                        }}
                      >
                        {expandedColumns.has(`${columnKey}:source:${source.id}`)
                          ? "-"
                          : "+"}
                      </button>
                    ) : null}
                    <div className="min-w-0" style={{ color: "var(--text-muted)" }}>
                      {source.label}
                    </div>
                  </div>
                  <div className="font-medium">
                    {formatPeriodBreakdownValue(source.value, column.valueKind)}
                  </div>
                </div>
                {source.children?.length &&
                expandedColumns.has(`${columnKey}:source:${source.id}`) ? (
                  <div
                    className="ml-6 space-y-1 border-l pl-2"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    {source.children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-start justify-between gap-2"
                      >
                        <span style={{ color: "var(--text-muted)" }}>
                          {child.label}
                        </span>
                        <span className="font-medium">
                          {formatPeriodBreakdownValue(child.value, column.valueKind)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

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
        className={uiMode === "saas" ? "unified-dashboard-scroll" : "overflow-x-auto rounded-2xl"}
        style={{ border: "1px solid var(--glass-border)" }}
      >
        <table className={uiMode === "saas" ? "unified-dashboard-table unified-period-table" : "glass-table min-w-max"}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{renderHeader(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.periodRows.map((row) => {
              const key = periodRowKey(row);
              const companies = companyBreakdownsByPeriod.get(key) ?? [];
              return (
                <Fragment key={key}>
                  <tr>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render(row)}</td>
                    ))}
                  </tr>
                  {expandedPeriods.has(key)
                    ? companies.map((company) => {
                        const companyKey = `${key}:${company.companyId}`;
                        const companyExpanded = expandedCompanies.has(companyKey);
                        return (
                          <Fragment key={companyKey}>
                            <tr style={{ background: "rgba(15, 23, 42, 0.28)" }}>
                              {columns.map((column) => (
                                <td key={`${companyKey}:${column.key}`}>
                                  {renderCompanyCell(company, row, column)}
                                </td>
                              ))}
                            </tr>
                            {companyExpanded ? (
                              <tr style={{ background: "rgba(15, 23, 42, 0.34)" }}>
                                {columns.map((column) => (
                                  <td key={`${companyKey}:drill:${column.key}`}>
                                    {renderColumnBreakdownCell(company, row, column)}
                                  </td>
                                ))}
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })
                    : null}
                </Fragment>
              );
            })}
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
