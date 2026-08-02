"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { saveOverviewAdvancePreferenceAction } from "./overview-actions";
import {
  buildOverviewMonthlyPnlTotals,
  calculateOverviewMonthlyNetPlInrCents,
  type OverviewMonthlyPnlRow,
} from "@/src/features/billing/overview-pnl-summary";
import {
  formatInr,
  formatRate,
  formatSignedInr,
  formatUsd,
} from "@/src/features/billing/utils";

type OverviewPnlSummaryTableProps = {
  rows: OverviewMonthlyPnlRow[];
  initialExcludeAdvanceDeduction: boolean;
  preferenceLoadFailed: boolean;
};

type ColumnKey =
  | "effectiveDollarInward"
  | "cashoutRate"
  | "effectiveInwardInr"
  | "salaryPaid"
  | "pf"
  | "tds"
  | "fxGain"
  | "operatingMargin"
  | "grossPnl"
  | "expenses"
  | "advances"
  | "netPnl";

const columns: Array<{ key: ColumnKey; label: string; width: string }> = [
  { key: "effectiveDollarInward", label: "Effective dollar inward (USD)", width: "9.5rem" },
  { key: "cashoutRate", label: "Cashout rate", width: "7rem" },
  { key: "effectiveInwardInr", label: "Total effective INR inward", width: "10rem" },
  { key: "salaryPaid", label: "Total salary paid", width: "9rem" },
  { key: "pf", label: "PF", width: "7.5rem" },
  { key: "tds", label: "TDS", width: "7.5rem" },
  { key: "fxGain", label: "Forex gain", width: "8.5rem" },
  { key: "operatingMargin", label: "Operating margin", width: "9rem" },
  { key: "grossPnl", label: "Total earning (Gross P&L)", width: "10rem" },
  { key: "expenses", label: "Expenses (INR)", width: "8.5rem" },
  { key: "advances", label: "Advances (INR)", width: "10rem" },
  { key: "netPnl", label: "Net P&L", width: "9rem" },
];

function financialColor(cents: number | null) {
  if (cents === null) return "var(--text-muted)";
  if (cents < 0) return "#fca5a5";
  if (cents > 0) return "#6ee7b7";
  return "var(--text-primary)";
}

function renderValue(
  row: OverviewMonthlyPnlRow,
  key: ColumnKey,
  excludeAdvanceDeduction: boolean,
) {
  const formatNullableInr = (value: number | null) =>
    value === null ? "—" : formatInr(value);

  switch (key) {
    case "effectiveDollarInward":
      return formatUsd(row.effectiveDollarInwardUsdCents);
    case "cashoutRate":
      return row.cashoutUsdInrRate === null ? "—" : formatRate(row.cashoutUsdInrRate);
    case "effectiveInwardInr":
      return formatNullableInr(row.effectiveInwardInrCents);
    case "salaryPaid":
      return formatInr(row.salaryPaidInrCents);
    case "pf":
      return formatInr(row.pfInrCents);
    case "tds":
      return formatInr(row.tdsInrCents);
    case "expenses":
      return formatInr(row.expensesInrCents);
    case "advances":
      return formatInr(row.advancesInrCents);
    case "fxGain":
      return formatNullableInr(row.fxGainInrCents);
    case "operatingMargin":
      return formatNullableInr(row.operatingMarginInrCents);
    case "grossPnl":
      return formatNullableInr(row.grossPnlInrCents);
    case "netPnl":
      const netPnlInrCents = calculateOverviewMonthlyNetPlInrCents(
        row,
        excludeAdvanceDeduction,
      );
      return netPnlInrCents === null ? "—" : formatSignedInr(netPnlInrCents);
  }
}

function cellColor(
  row: OverviewMonthlyPnlRow,
  key: ColumnKey,
  excludeAdvanceDeduction: boolean,
) {
  if (key === "expenses") {
    return row.expensesInrCents > 0 ? "#fca5a5" : "var(--text-primary)";
  }
  if (key === "advances") {
    return row.advancesInrCents > 0 ? "#fbbf24" : "var(--text-primary)";
  }
  if (key === "fxGain") return financialColor(row.fxGainInrCents);
  if (key === "operatingMargin") return financialColor(row.operatingMarginInrCents);
  if (key === "grossPnl") return financialColor(row.grossPnlInrCents);
  if (key === "netPnl") {
    return financialColor(
      calculateOverviewMonthlyNetPlInrCents(row, excludeAdvanceDeduction),
    );
  }
  return "var(--text-primary)";
}

export function OverviewPnlSummaryTable({
  rows,
  initialExcludeAdvanceDeduction,
  preferenceLoadFailed,
}: OverviewPnlSummaryTableProps) {
  const [excludeAdvanceDeduction, setExcludeAdvanceDeduction] = useState(
    initialExcludeAdvanceDeduction,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        No P&amp;L data found for the selected period.
      </p>
    );
  }

  const totals = buildOverviewMonthlyPnlTotals(rows);

  const handlePreferenceChange = (nextValue: boolean) => {
    const previousValue = excludeAdvanceDeduction;
    setExcludeAdvanceDeduction(nextValue);
    setSaveError(null);
    startTransition(async () => {
      try {
        const result = await saveOverviewAdvancePreferenceAction(nextValue);
        if (result.ok) return;

        setExcludeAdvanceDeduction(previousValue);
        setSaveError(result.message);
      } catch {
        setExcludeAdvanceDeduction(previousValue);
        setSaveError("Could not save the Overview preference.");
      }
    });
  };

  const renderRow = (row: OverviewMonthlyPnlRow, isTotal = false) => (
    <tr
      key={row.monthKey}
      style={isTotal ? { background: "rgba(99, 102, 241, 0.08)" } : undefined}
    >
      <td
        className={`sticky left-0 z-10 px-4 py-4 ${isTotal ? "font-semibold" : "font-medium"}`}
        style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
      >
        {row.periodLabel}
      </td>
      {columns.map((column) => (
        <td
          key={`${row.monthKey}-${column.key}`}
          className={`px-4 py-4 ${isTotal ? "font-semibold" : ""}`}
          style={{
            color: cellColor(row, column.key, excludeAdvanceDeduction),
            fontWeight:
              column.key === "grossPnl" || column.key === "netPnl" ? 700 : undefined,
          }}
        >
          {renderValue(row, column.key, excludeAdvanceDeduction)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-3">
      {preferenceLoadFailed ? (
        <p
          className="rounded-md border px-3 py-2 text-sm"
          role="status"
          style={{ borderColor: "rgba(251, 191, 36, 0.35)", color: "#fde68a" }}
        >
          Preference could not be loaded. Advances are being deducted.
        </p>
      ) : null}
      {saveError ? (
        <p
          className="rounded-md border px-3 py-2 text-sm"
          role="alert"
          style={{ borderColor: "rgba(252, 165, 165, 0.35)", color: "#fca5a5" }}
        >
          {saveError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--glass-border)" }}>
        <table className="glass-table min-w-max" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "8.5rem" }} />
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-20"
                style={{ background: "var(--bg-elevated)", textAlign: "left" }}
              >
                Period
              </th>
              <th colSpan={3} className="text-center">Inward</th>
              <th colSpan={3} className="text-center">Payouts</th>
              <th colSpan={3} className="text-center">Performance</th>
              <th colSpan={2} className="text-center">Deductions</th>
              <th colSpan={1} className="text-center">Result</th>
            </tr>
            <tr data-testid="overview-column-labels">
              {columns.map((column) => (
                <th key={column.key}>
                  {column.key === "advances" ? (
                    <label className="mb-2 flex items-center gap-2 text-xs font-medium normal-case">
                      <input
                        type="checkbox"
                        checked={excludeAdvanceDeduction}
                        disabled={isPending}
                        onChange={(event) => handlePreferenceChange(event.currentTarget.checked)}
                        className="h-4 w-4"
                        style={{ accentColor: "var(--accent-1)" }}
                      />
                      <span>Exclude advance deduction</span>
                      {isPending ? (
                        <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                    </label>
                  ) : null}
                  <span data-testid="overview-column-label">{column.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows.map((row) => renderRow(row))}</tbody>
          <tfoot>{renderRow(totals, true)}</tfoot>
        </table>
      </div>
    </div>
  );
}
