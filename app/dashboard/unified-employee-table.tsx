"use client";

import {
  Maximize2,
  Minimize2,
  Pencil,
  RotateCcw,
  Save,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { NumericInput } from "../_components/numeric-input";
import { inputClass } from "../_components/field";
import { buildEmployeeSectionTotals } from "../../src/features/billing/dashboard-table-totals";
import { EMPLOYEE_DASHBOARD_COLUMN_OPTIONS } from "../../src/features/billing/dashboard-column-options";
import { calculateEmployeePayoutMetrics } from "../../src/features/billing/domain";
import {
  calculateCashInInrCents,
  calculateEffectiveDollarInwardUsdCents,
} from "../../src/features/billing/employee-cash-flow";
import {
  calculatePnEmployeeAdvanceInrCents,
  calculatePnEmployeeNetPlInrCents,
} from "../../src/features/billing/pn-dashboard";
import type {
  DashboardBulkUpdateResult,
  DashboardBulkUpdateRowInput,
  PnDashboardData,
  PnEmployeeEditableRow,
} from "../../src/features/billing/types";
import {
  formatInr,
  formatMonthYear,
  formatRate,
  formatSignedInr,
  formatUsd,
} from "../../src/features/billing/utils";

type Props = {
  data: PnDashboardData;
  selectedColumnKeys: string[];
  includeAdvances: boolean;
  setIncludeAdvances: (value: boolean) => void;
  exportHrefs?: { tableCsv: string; tablePdf: string };
  bulkUpdateAction: (
    rows: DashboardBulkUpdateRowInput[],
  ) => Promise<DashboardBulkUpdateResult>;
};

const PRESETS = {
  "P&L": [
    "effectiveDollarInward",
    "cashoutRate",
    "salaryPaid",
    "pf",
    "tds",
    "fxCommission",
    "commissionEarned",
    "grossEarnings",
    "advances",
    "netProfit",
  ],
  Payroll: [
    "daysWorked",
    "paidRate",
    "monthlyPaid",
    "actualPaid",
    "salaryPaid",
    "pf",
    "tds",
    "netProfit",
  ],
  "Cash Flow": [
    "dollarInward",
    "onboardingAdvance",
    "reimbursements",
    "appraisalAdvance",
    "offboardingDeduction",
    "effectiveDollarInward",
    "cashoutRate",
    "cashIn",
  ],
  Detailed: EMPLOYEE_DASHBOARD_COLUMN_OPTIONS.map((option) => option.value),
} as const;

const EDITABLE_COLUMN_KEYS = new Set([
  "daysWorked",
  "dollarInward",
  "onboardingAdvance",
  "reimbursements",
  "reimbursementLabels",
  "appraisalAdvance",
  "offboardingDeduction",
  "cashoutRate",
  "paidRate",
  "actualPaid",
  "pf",
  "tds",
  "advances",
]);

function rowInput(
  employeeName: string,
  row: PnEmployeeEditableRow,
): DashboardBulkUpdateRowInput {
  return {
    payoutId: row.payoutId,
    employeeName,
    periodLabel: formatMonthYear(row.month, row.year),
    daysWorked: row.daysWorked,
    dollarInwardUsdCents: row.dollarInwardUsdCents,
    onboardingAdvanceUsdCents: row.onboardingAdvanceUsdCents,
    advanceOverrideInrCents: row.advanceOverrideInrCents ?? null,
    reimbursementUsdCents: row.reimbursementUsdCents,
    reimbursementLabelsText: row.reimbursementLabelsText,
    appraisalAdvanceUsdCents: row.appraisalAdvanceUsdCents,
    offboardingDeductionUsdCents: row.offboardingDeductionUsdCents,
    cashoutUsdInrRate: row.cashoutUsdInrRate,
    paidUsdInrRate: row.paidUsdInrRate,
    pfInrCents: row.pfInrCents,
    tdsInrCents: row.tdsInrCents,
    actualPaidInrCents: row.actualPaidInrCents,
  };
}

function buildInitialDrafts(data: PnDashboardData) {
  return Object.fromEntries(
    data.employeeEditableSections.flatMap((section) =>
      section.rows.map((row) => [row.payoutId, rowInput(section.employeeName, row)]),
    ),
  );
}

function recalculateRow(
  source: PnEmployeeEditableRow,
  draft: DashboardBulkUpdateRowInput,
): PnEmployeeEditableRow {
  if (source.isSalaryOnly) return source;
  const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
    baseDollarInwardUsdCents: draft.dollarInwardUsdCents,
    onboardingAdvanceUsdCents: draft.onboardingAdvanceUsdCents,
    reimbursementUsdCents: draft.reimbursementUsdCents,
    appraisalAdvanceUsdCents: draft.appraisalAdvanceUsdCents,
    offboardingDeductionUsdCents: draft.offboardingDeductionUsdCents,
  });
  const cashInInrCents = calculateCashInInrCents({
    effectiveDollarInwardUsdCents,
    cashoutUsdInrRate: draft.cashoutUsdInrRate,
  });
  const payout = calculateEmployeePayoutMetrics({
    dollarInwardUsdCents: effectiveDollarInwardUsdCents,
    actualPaidInrCents: draft.actualPaidInrCents,
    pegUsdInrRate: draft.paidUsdInrRate,
    receivedUsdInrRate: draft.cashoutUsdInrRate,
  });
  const salaryPaidInrCents = Math.max(
    0,
    draft.actualPaidInrCents - draft.pfInrCents - draft.tdsInrCents,
  );
  return {
    ...source,
    ...draft,
    baseDollarInwardUsdCents: draft.dollarInwardUsdCents,
    effectiveDollarInwardUsdCents,
    cashInInrCents,
    salaryPaidInrCents,
    reimbursementInrCents: Math.round(
      draft.reimbursementUsdCents * draft.cashoutUsdInrRate,
    ),
    appraisalAdvanceInrCents: Math.round(
      draft.appraisalAdvanceUsdCents * draft.cashoutUsdInrRate,
    ),
    fxCommissionInrCents: payout.fxCommissionInrCents,
    totalCommissionUsdCents: payout.totalCommissionUsdCents,
    commissionEarnedInrCents: payout.commissionEarnedInrCents,
    grossEarningsInrCents:
      payout.fxCommissionInrCents + payout.commissionEarnedInrCents,
  };
}

function centsFromText(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function numberFromText(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildVisibleExportHref(baseHref: string, employeeIds: string[]) {
  const url = new URL(baseHref, "http://localhost");
  url.searchParams.delete("employeeIds");
  url.searchParams.delete("allEmployees");
  for (const employeeId of employeeIds) url.searchParams.append("employeeIds", employeeId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function UnifiedEmployeeTable({
  data,
  selectedColumnKeys,
  includeAdvances,
  setIncludeAdvances,
  exportHrefs,
  bulkUpdateAction,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [focusMode, setFocusMode] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState(() => buildInitialDrafts(data));
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<DashboardBulkUpdateResult["failedRows"]>([]);

  const visibleSections = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return data.employeeEditableSections;
    return data.employeeEditableSections.filter((section) =>
      section.employeeName.toLocaleLowerCase().includes(normalized),
    );
  }, [data.employeeEditableSections, query]);

  const visibleEmployeeIds = visibleSections.map((section) => section.employeeId);
  const selectedColumns = EMPLOYEE_DASHBOARD_COLUMN_OPTIONS.filter((option) =>
    selectedColumnKeys.includes(option.value),
  );
  const visibleRowCount = visibleSections.reduce(
    (count, section) => count + section.rows.length,
    0,
  );

  useEffect(() => {
    if (dirtyIds.size === 0) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const beforeUiSwitch = (event: Event) => {
      if (!window.confirm("Discard unsaved dashboard changes?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("eassyonboard:before-ui-switch", beforeUiSwitch);
    window.addEventListener("eassyonboard:before-navigation", beforeUiSwitch);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("eassyonboard:before-ui-switch", beforeUiSwitch);
      window.removeEventListener("eassyonboard:before-navigation", beforeUiSwitch);
    };
  }, [dirtyIds.size]);

  const cancelEditing = () => {
    if (dirtyIds.size > 0 && !window.confirm("Discard unsaved dashboard changes?")) return;
    setDrafts(buildInitialDrafts(data));
    setDirtyIds(new Set());
    setErrors([]);
    setEditing(false);
  };

  const save = async () => {
    if (dirtyIds.size === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setErrors([]);
    try {
      const result = await bulkUpdateAction(
        [...dirtyIds].map((payoutId) => drafts[payoutId]).filter(Boolean),
      );
      setDirtyIds((current) => {
        const next = new Set(current);
        for (const payoutId of result.savedPayoutIds) next.delete(payoutId);
        return next;
      });
      setErrors(result.failedRows);
      if (result.failedRows.length === 0) setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "e") {
        event.preventDefault();
        setEditing(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
      if (event.key === "Escape" && editing && !saving) cancelEditing();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const updateDraft = (
    payoutId: string,
    patch: Partial<DashboardBulkUpdateRowInput>,
  ) => {
    setDrafts((current) => ({
      ...current,
      [payoutId]: { ...current[payoutId], ...patch },
    }));
    setDirtyIds((current) => new Set(current).add(payoutId));
    setErrors((current) => current.filter((error) => error.payoutId !== payoutId));
  };

  const applyPreset = (keys: readonly string[]) => {
    if (dirtyIds.size > 0 && !window.confirm("Discard unsaved dashboard changes?")) return;
    const params = new URLSearchParams(window.location.search);
    params.delete("employeeColumns");
    for (const key of keys) params.append("employeeColumns", key);
    window.location.assign(`/dashboard?${params.toString()}`);
  };

  const resetFilters = () => {
    if (dirtyIds.size > 0 && !window.confirm("Discard unsaved dashboard changes?")) return;
    const current = new URLSearchParams(window.location.search);
    const params = new URLSearchParams();
    for (const companyId of current.getAll("companyIds")) params.append("companyIds", companyId);
    params.set("view", "employee");
    params.set("periodType", current.get("periodType") ?? "monthly");
    window.location.assign(`/dashboard?${params.toString()}`);
  };

  const renderNumericEditor = (
    row: PnEmployeeEditableRow,
    key: string,
    value: number,
    patch: (raw: string) => Partial<DashboardBulkUpdateRowInput>,
    precision = 2,
  ) => {
    if (!editing || row.isSalaryOnly || !EDITABLE_COLUMN_KEYS.has(key)) return null;
    return (
      <NumericInput
        aria-label={`${key} for ${formatMonthYear(row.month, row.year)}`}
        value={value}
        min={key === "daysWorked" ? 1 : 0}
        max={key === "daysWorked" ? row.daysInMonth : undefined}
        precision={precision}
        className={`${inputClass} unified-cell-input`}
        onValueChange={(raw) => updateDraft(row.payoutId, patch(raw))}
      />
    );
  };

  const renderCell = (key: string, source: PnEmployeeEditableRow) => {
    const draft = drafts[source.payoutId] ?? rowInput("", source);
    const row = recalculateRow(source, draft);
    const numeric = (
      value: number,
      patch: (raw: string) => Partial<DashboardBulkUpdateRowInput>,
      precision = 2,
    ) => renderNumericEditor(source, key, value, patch, precision);
    const currencyEditor = (
      cents: number,
      patch: (cents: number) => Partial<DashboardBulkUpdateRowInput>,
    ) => numeric(cents / 100, (raw) => patch(centsFromText(raw)));

    switch (key) {
      case "daysWorked":
        return numeric(draft.daysWorked, (raw) => ({ daysWorked: numberFromText(raw) }), 0) ?? `${row.daysWorked} / ${row.daysInMonth}`;
      case "dollarInward":
        return currencyEditor(draft.dollarInwardUsdCents, (value) => ({ dollarInwardUsdCents: value })) ?? formatUsd(row.dollarInwardUsdCents);
      case "onboardingAdvance":
        return currencyEditor(draft.onboardingAdvanceUsdCents, (value) => ({ onboardingAdvanceUsdCents: value })) ?? formatUsd(row.onboardingAdvanceUsdCents);
      case "reimbursements":
        return currencyEditor(draft.reimbursementUsdCents, (value) => ({ reimbursementUsdCents: value })) ?? formatUsd(row.reimbursementUsdCents);
      case "reimbursementLabels":
        return editing && !source.isSalaryOnly ? (
          <input
            className={`${inputClass} unified-cell-input min-w-40`}
            value={draft.reimbursementLabelsText}
            onChange={(event) => updateDraft(row.payoutId, { reimbursementLabelsText: event.target.value })}
          />
        ) : row.reimbursementLabelsText || "-";
      case "reimbursementsInr": return formatInr(row.reimbursementInrCents);
      case "appraisalAdvance":
        return currencyEditor(draft.appraisalAdvanceUsdCents, (value) => ({ appraisalAdvanceUsdCents: value })) ?? formatUsd(row.appraisalAdvanceUsdCents);
      case "appraisalAdvanceInr": return formatInr(row.appraisalAdvanceInrCents);
      case "offboardingDeduction":
        return currencyEditor(draft.offboardingDeductionUsdCents, (value) => ({ offboardingDeductionUsdCents: value })) ?? formatUsd(row.offboardingDeductionUsdCents);
      case "effectiveDollarInward": return formatUsd(row.effectiveDollarInwardUsdCents);
      case "cashoutRate":
        return numeric(draft.cashoutUsdInrRate, (raw) => ({ cashoutUsdInrRate: numberFromText(raw) })) ?? formatRate(row.cashoutUsdInrRate);
      case "cashIn": return formatInr(row.cashInInrCents);
      case "paidRate":
        return numeric(draft.paidUsdInrRate, (raw) => ({ paidUsdInrRate: numberFromText(raw) }), 4) ?? formatRate(row.paidUsdInrRate);
      case "monthlyPaid": return formatInr(row.monthlyPaidInrCents);
      case "actualPaid":
        return currencyEditor(draft.actualPaidInrCents, (value) => ({ actualPaidInrCents: value })) ?? formatInr(row.actualPaidInrCents);
      case "salaryPaid": return formatInr(row.salaryPaidInrCents);
      case "pf":
        return currencyEditor(draft.pfInrCents, (value) => ({ pfInrCents: value })) ?? formatInr(row.pfInrCents);
      case "tds":
        return currencyEditor(draft.tdsInrCents, (value) => ({ tdsInrCents: value })) ?? formatInr(row.tdsInrCents);
      case "fxCommission": return formatInr(row.fxCommissionInrCents);
      case "commissionEarned": return formatInr(row.commissionEarnedInrCents);
      case "grossEarnings": return formatInr(row.grossEarningsInrCents);
      case "advances": {
        const editor = renderNumericEditor(
          source,
          key,
          calculatePnEmployeeAdvanceInrCents(row) / 100,
          (raw) => ({
            advanceOverrideInrCents: raw.trim() ? centsFromText(raw) : null,
          }),
        );
        return editor ?? formatInr(calculatePnEmployeeAdvanceInrCents(row));
      }
      case "netProfit": {
        const net = calculatePnEmployeeNetPlInrCents(row, { includeAdvances });
        return <span className={net < 0 ? "value-negative" : net > 0 ? "value-positive" : ""}>{formatSignedInr(net)}</span>;
      }
      default: return "-";
    }
  };

  const renderTotal = (
    key: string,
    totals: ReturnType<typeof buildEmployeeSectionTotals>,
  ) => {
    const values: Record<string, React.ReactNode> = {
      daysWorked: totals.daysWorked,
      dollarInward: formatUsd(totals.dollarInwardUsdCents),
      onboardingAdvance: formatUsd(totals.onboardingAdvanceUsdCents),
      reimbursements: formatUsd(totals.reimbursementUsdCents),
      reimbursementLabels: "",
      reimbursementsInr: formatInr(totals.reimbursementInrCents),
      appraisalAdvance: formatUsd(totals.appraisalAdvanceUsdCents),
      appraisalAdvanceInr: formatInr(totals.appraisalAdvanceInrCents),
      offboardingDeduction: formatUsd(totals.offboardingDeductionUsdCents),
      effectiveDollarInward: formatUsd(totals.effectiveDollarInwardUsdCents),
      cashoutRate: formatRate(totals.cashoutUsdInrRate),
      cashIn: formatInr(totals.cashInInrCents),
      paidRate: formatRate(totals.paidUsdInrRate),
      monthlyPaid: formatInr(totals.monthlyPaidInrCents),
      actualPaid: formatInr(totals.actualPaidInrCents),
      salaryPaid: formatInr(totals.salaryPaidInrCents),
      pf: formatInr(totals.pfInrCents),
      tds: formatInr(totals.tdsInrCents),
      fxCommission: formatInr(totals.fxCommissionInrCents),
      commissionEarned: formatInr(totals.commissionEarnedInrCents),
      grossEarnings: formatInr(totals.grossEarningsInrCents),
      advances: formatInr(totals.advancesInrCents),
      netProfit: formatSignedInr(includeAdvances ? totals.netPlInrCents : totals.netPlBeforeAdvancesInrCents),
    };
    return values[key] ?? "-";
  };

  const allVisibleRows = visibleSections.flatMap((section) =>
    section.rows.map((row) => recalculateRow(row, drafts[row.payoutId] ?? rowInput(section.employeeName, row))),
  );
  const grandTotals = buildEmployeeSectionTotals(allVisibleRows);
  const rowPadding = density === "compact" ? "py-2" : "py-3.5";

  return (
    <section
      aria-busy={saving}
      className={focusMode ? "unified-dashboard-focus" : "space-y-3"}
    >
      <div className="unified-dashboard-toolbar">
        <label className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <span className="sr-only">Search employees</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search employees"
            className={`${inputClass} w-full pl-9`}
          />
        </label>
        <div className="segmented-control" aria-label="Table density">
          <button type="button" aria-pressed={density === "compact"} onClick={() => setDensity("compact")}>Compact</button>
          <button type="button" aria-pressed={density === "comfortable"} onClick={() => setDensity("comfortable")}>Comfortable</button>
        </div>
        <button type="button" className="btn-outline icon-text-button" onClick={() => setFocusMode((value) => !value)}>
          {focusMode ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          {focusMode ? "Exit focus" : "Focus"}
        </button>
        <button type="button" className="btn-outline icon-text-button" onClick={resetFilters}>
          <RotateCcw aria-hidden="true" /> Reset filters
        </button>
        {editing ? (
          <>
            <button type="button" className="btn-outline icon-text-button" disabled={saving} onClick={cancelEditing}>
              <X aria-hidden="true" /> Cancel
            </button>
            <button type="button" className="gradient-btn icon-text-button" disabled={saving || dirtyIds.size === 0} onClick={() => void save()}>
              <Save aria-hidden="true" /> {saving ? "Saving..." : `Save${dirtyIds.size ? ` (${dirtyIds.size})` : ""}`}
            </button>
          </>
        ) : (
          <button type="button" className="gradient-btn icon-text-button" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" /> Edit
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {visibleSections.length} employees · {visibleRowCount} periods
          {dirtyIds.size > 0 ? ` · ${dirtyIds.size} unsaved rows` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Column presets">
          <span className="mr-1 text-xs font-medium text-gray-500">Columns</span>
          {Object.entries(PRESETS).map(([label, keys]) => (
            <button key={label} type="button" className="preset-button" onClick={() => applyPreset(keys)}>{label}</button>
          ))}
        </div>
      </div>

      {errors.length > 0 ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.map((error) => (
            <p key={error.payoutId}><strong>{error.employeeName}, {error.periodLabel}:</strong> {error.message}</p>
          ))}
        </div>
      ) : null}

      <div className="unified-dashboard-scroll" tabIndex={0} aria-label="Employee P&L spreadsheet">
        <table className="unified-dashboard-table">
          <thead>
            <tr>
              <th className="sticky-employee-column">Employee</th>
              <th className="sticky-period-column">Period</th>
              {selectedColumns.map((column) => (
                <th key={column.value}>
                  {column.value === "advances" ? (
                    <label className="flex flex-col items-start gap-1">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                        <input
                          type="checkbox"
                          checked={includeAdvances}
                          onChange={(event) => setIncludeAdvances(event.target.checked)}
                        />
                        In P/L
                      </span>
                      <span>{column.label}</span>
                    </label>
                  ) : column.label}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleSections.flatMap((section) => {
              const recalculatedRows = section.rows.map((row) =>
                recalculateRow(row, drafts[row.payoutId] ?? rowInput(section.employeeName, row)),
              );
              const totals = buildEmployeeSectionTotals(recalculatedRows);
              return [
                ...section.rows.map((row, rowIndex) => (
                  <tr key={row.payoutId} className={`${rowIndex === 0 ? "employee-group-start" : ""} ${dirtyIds.has(row.payoutId) ? "dirty-row" : ""}`}>
                    {rowIndex === 0 ? (
                      <th
                        scope="rowgroup"
                        rowSpan={section.rows.length + 1}
                        className={`sticky-employee-column employee-group-name ${rowPadding}`}
                      >
                        {section.employeeName}
                      </th>
                    ) : null}
                    <td className={`sticky-period-column ${rowPadding}`}>{formatMonthYear(row.month, row.year)}</td>
                    {selectedColumns.map((column) => <td key={column.value} className={rowPadding}>{renderCell(column.value, row)}</td>)}
                    <td className={`${rowPadding} text-xs text-gray-500`}>{row.isSalaryOnly ? "Salary only" : dirtyIds.has(row.payoutId) ? "Unsaved" : editing ? "Editable" : "View"}</td>
                  </tr>
                )),
                <tr key={`${section.employeeId}-subtotal`} className="employee-subtotal-row">
                  <td className="sticky-period-column">Subtotal</td>
                  {selectedColumns.map((column) => <td key={column.value}>{renderTotal(column.value, totals)}</td>)}
                  <td />
                </tr>,
              ];
            })}
            {visibleSections.length === 0 ? (
              <tr><td colSpan={selectedColumns.length + 3} className="py-10 text-center text-gray-500">No employees match the current search and filters.</td></tr>
            ) : null}
          </tbody>
          {visibleSections.length > 0 ? (
            <tfoot>
              <tr>
                <th className="sticky-employee-column">Grand total</th>
                <td className="sticky-period-column">All visible</td>
                {selectedColumns.map((column) => <td key={column.value}>{renderTotal(column.value, grandTotals)}</td>)}
                <td />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {exportHrefs ? (
        <div className="flex flex-wrap gap-2">
          <a className="btn-outline" href={buildVisibleExportHref(exportHrefs.tableCsv, visibleEmployeeIds)}>Export CSV</a>
          <a className="btn-outline" href={buildVisibleExportHref(exportHrefs.tablePdf, visibleEmployeeIds)}>Export PDF</a>
        </div>
      ) : null}
    </section>
  );
}
