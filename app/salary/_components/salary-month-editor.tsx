"use client";

import { useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";
import * as XLSX from "xlsx";

import { Field, inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { saveMonthlyPayrollRowsAction } from "@/src/features/billing/actions";
import {
  calculateActualPaidInrCents,
  calculateMonthlyPaidInrCents,
  calculateSalaryPaidInrCents,
  normalizePayrollDaysWorked,
  summarizePayrollRows,
  type MonthlyPayrollRow,
  type PayrollStatus,
} from "@/src/features/billing/payroll";
import {
  applySalaryImportToRows,
  buildSalaryImportTemplateCsv,
  buildSalaryImportTemplateRows,
  matchSalaryImportRows,
  parseSalaryImportCsv,
  parseSalaryImportSheetRows,
  SALARY_IMPORT_HEADERS,
  type SalaryImportCell,
  type SalaryImportMatchResult,
} from "@/src/features/billing/salary-import";
import { formatInr } from "@/src/features/billing/utils";

type EditablePayrollRow = MonthlyPayrollRow & {
  notes: string;
};

type ImportSummary = SalaryImportMatchResult & {
  fileName: string;
  parsedRows: number;
  skippedRows: number;
  errors: string[];
};

function inrInputValue(cents: number) {
  return (cents / 100).toFixed(2);
}

function centsFromInrInput(value: string) {
  const parsed = Number.parseFloat(value || "0");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 100);
}

function calculateRowTotals(row: EditablePayrollRow) {
  const monthlyPaidInrCents = calculateMonthlyPaidInrCents(row);
  const actualPaidInrCents = calculateActualPaidInrCents({
    monthlyPaidInrCents,
    daysWorked: row.daysWorked,
    daysInMonth: row.daysInMonth,
  });
  try {
    return {
      monthlyPaidInrCents,
      actualPaidInrCents,
      salaryPaidInrCents: calculateSalaryPaidInrCents({
        actualPaidInrCents,
        pfInrCents: row.pfInrCents,
        tdsInrCents: row.tdsInrCents,
      }),
      needsReview: false,
    };
  } catch {
    return {
      monthlyPaidInrCents,
      actualPaidInrCents,
      salaryPaidInrCents: actualPaidInrCents - row.pfInrCents - row.tdsInrCents,
      needsReview: true,
    };
  }
}

function toEditableRow(row: MonthlyPayrollRow): EditablePayrollRow {
  return {
    ...row,
    notes: row.notes ?? "",
  };
}

export function SalaryMonthEditor({
  companyId,
  month,
  rows,
  returnTo,
}: {
  companyId: string;
  month: string;
  rows: MonthlyPayrollRow[];
  returnTo: string;
}) {
  const [status, setStatus] = useState<PayrollStatus>(
    rows.some((row) => row.status === "verified")
      ? "verified"
      : rows.some((row) => row.status === "in_review")
        ? "in_review"
        : "draft",
  );
  const [updateEmployeeMaster, setUpdateEmployeeMaster] = useState(false);
  const [updateEmployeeIdentityFromImport, setUpdateEmployeeIdentityFromImport] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | undefined>();
  const [editableRows, setEditableRows] = useState(() => rows.map(toEditableRow));
  const rowsWithTotals = useMemo(
    () =>
      editableRows.map((row) => ({
        ...row,
        ...calculateRowTotals(row),
      })),
    [editableRows],
  );
  const hasRowsNeedingReview = rowsWithTotals.some((row) => row.needsReview);
  const summary = useMemo(
    () =>
      summarizePayrollRows(
        rowsWithTotals.filter((row) => !row.needsReview),
      ),
    [rowsWithTotals],
  );
  const rowsJson = useMemo(
    () =>
      JSON.stringify(
        rowsWithTotals.map((row) => ({
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          basicInrCents: row.basicInrCents,
          specialAllowanceInrCents: row.specialAllowanceInrCents,
          insuranceInrCents: row.insuranceInrCents,
          bonusInrCents: row.bonusInrCents,
          monthlyPaidInrCents: row.monthlyPaidInrCents,
          daysWorked: row.daysWorked,
          daysInMonth: row.daysInMonth,
          actualPaidInrCents: row.actualPaidInrCents,
          salaryPaidInrCents: row.salaryPaidInrCents,
          pfInrCents: row.pfInrCents,
          tdsInrCents: row.tdsInrCents,
          notes: row.notes,
          importedPanNumber: row.importedPanNumber,
          importedPfUan: row.importedPfUan,
          importedDesignation: row.importedDesignation,
          importedActiveFrom: row.importedActiveFrom,
        })),
      ),
    [rowsWithTotals],
  );

  function updateRow(employeeId: string, patch: Partial<EditablePayrollRow>) {
    setEditableRows((current) =>
      current.map((row) => (row.employeeId === employeeId ? { ...row, ...patch } : row)),
    );
  }

  function applyParsedImport(input: {
    fileName: string;
    rows: ReturnType<typeof parseSalaryImportCsv>["rows"];
    skippedRows: number;
    errors: string[];
  }) {
    const matchResult =
      input.errors.length === 0
        ? matchSalaryImportRows({ importRows: input.rows, payrollRows: editableRows })
        : { matches: [], unmatched: [], duplicates: [] };

    setImportSummary({
      fileName: input.fileName,
      parsedRows: input.rows.length,
      skippedRows: input.skippedRows,
      errors: input.errors,
      ...matchResult,
    });

    if (input.errors.length === 0 && matchResult.matches.length > 0) {
      setEditableRows((current) =>
        applySalaryImportToRows({
          payrollRows: current,
          matches: matchResult.matches,
          sourceFileName: input.fileName,
        }).map(toEditableRow),
      );
    }
  }

  async function importSalaryFile(file: File) {
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const result = parseSalaryImportCsv(await file.text(), {
          selectedMonth: month,
          sourceFileName: file.name,
        });
        applyParsedImport({ fileName: file.name, ...result });
        return;
      }

      const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      if (!sheet) {
        applyParsedImport({
          fileName: file.name,
          rows: [],
          skippedRows: 0,
          errors: ["The selected workbook does not contain a readable first sheet."],
        });
        return;
      }

      const sheetRows = XLSX.utils.sheet_to_json<SalaryImportCell[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });
      const result = parseSalaryImportSheetRows(sheetRows, {
        selectedMonth: month,
        sourceFileName: file.name,
      });
      applyParsedImport({ fileName: file.name, ...result });
    } catch (error) {
      applyParsedImport({
        fileName: file.name,
        rows: [],
        skippedRows: 0,
        errors: [error instanceof Error ? error.message : "Unable to read the selected salary file."],
      });
    }
  }

  function downloadFile(fileName: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsvTemplate() {
    downloadFile(
      "salary-import-format.csv",
      new Blob([buildSalaryImportTemplateCsv()], { type: "text/csv;charset=utf-8" }),
    );
  }

  function downloadXlsxTemplate() {
    const worksheet = XLSX.utils.aoa_to_sheet(buildSalaryImportTemplateRows());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Salary Import");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    downloadFile(
      "salary-import-format.xlsx",
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
  }

  return (
    <form action={saveMonthlyPayrollRowsAction} className="space-y-5">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="rowsJson" value={rowsJson} />
      <input
        type="hidden"
        name="updateEmployeeIdentityFromImport"
        value={updateEmployeeIdentityFromImport ? "true" : "false"}
      />

      <div className="glass-panel grid gap-4 p-5 md:grid-cols-4">
        <Field label="Month status">
          <select
            name="status"
            className={inputClass}
            value={status}
            onChange={(event) => setStatus(event.currentTarget.value as PayrollStatus)}
          >
            <option value="draft">Draft</option>
            <option value="in_review">In review</option>
            <option value="verified">Verified</option>
          </select>
        </Field>

        <Field label="Save mode">
          <select
            className={inputClass}
            value={updateEmployeeMaster ? "employee" : "salary"}
            onChange={(event) => setUpdateEmployeeMaster(event.currentTarget.value === "employee")}
          >
            <option value="salary">Only this salary month</option>
            <option value="employee">Update employee defaults too</option>
          </select>
        </Field>
        <input type="hidden" name="updateEmployeeMaster" value={updateEmployeeMaster ? "true" : "false"} />

        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--glass-border)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Actual paid</p>
          <p className="mt-1 text-lg font-semibold">{formatInr(summary.actualPaidInrCents)}</p>
        </div>

        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--glass-border)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Salary paid</p>
          <p className="mt-1 text-lg font-semibold">{formatInr(summary.salaryPaidInrCents)}</p>
        </div>
      </div>

      <div className="glass-panel space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Add from file</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Import XLSX or CSV rows into this visible salary sheet. Review, then use Save salary month.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-outline" onClick={downloadXlsxTemplate}>
              Download XLSX format
            </button>
            <button type="button" className="btn-outline" onClick={downloadCsvTemplate}>
              Download CSV format
            </button>
            <label className="gradient-btn inline-flex cursor-pointer items-center gap-2">
              Add from file
              <input
                className="sr-only"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void importSalaryFile(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <p className="text-sm font-medium">Required columns</p>
            <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
              {SALARY_IMPORT_HEADERS.slice(0, 10).join(", ")}
            </p>
            <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
              Optional: {SALARY_IMPORT_HEADERS.slice(10).join(", ")}
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--glass-border)" }}>
            <input
              type="checkbox"
              checked={updateEmployeeIdentityFromImport}
              onChange={(event) => setUpdateEmployeeIdentityFromImport(event.currentTarget.checked)}
            />
            <span>
              <span className="block font-medium">Update employee details from import</span>
              <span className="mt-1 block text-xs" style={{ color: "var(--text-muted)" }}>
                PAN Number, PF UAN, designation, and joining date update only after Save salary month.
              </span>
            </span>
          </label>
        </div>

        {importSummary ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              {[
                ["File", importSummary.fileName],
                ["Parsed", importSummary.parsedRows],
                ["Matched", importSummary.matches.length],
                ["Unmatched", importSummary.unmatched.length],
                ["Duplicate", importSummary.duplicates.length],
                ["Skipped", importSummary.skippedRows],
                ["Errors", importSummary.errors.length],
              ].map(([label, value]) => (
                <span
                  key={label}
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{ borderColor: "var(--glass-border)", color: "var(--text-muted)" }}
                >
                  {label}: {value}
                </span>
              ))}
            </div>

            {importSummary.errors.length > 0 ? (
              <ul className="space-y-1" style={{ color: "#fca5a5" }}>
                {importSummary.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}

            {importSummary.unmatched.length > 0 || importSummary.duplicates.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {importSummary.unmatched.length > 0 ? (
                  <div>
                    <p className="font-medium">Unmatched rows</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      {importSummary.unmatched.map((row) => row.employeeName).join(", ")}
                    </p>
                  </div>
                ) : null}
                {importSummary.duplicates.length > 0 ? (
                  <div>
                    <p className="font-medium">Duplicate matches</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      {importSummary.duplicates.map((row) => row.employeeName).join(", ")}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--glass-border)" }}>
          <div>
            <h2 className="text-lg font-semibold">Salary sheet</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {summary.employeeCount} employees - Monthly {formatInr(summary.monthlyPaidInrCents)} - PF {formatInr(summary.pfInrCents)} - TDS {formatInr(summary.tdsInrCents)}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full px-3 py-1 text-xs" style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--text-accent)" }}>
            <BadgeCheck className="h-4 w-4" />
            {hasRowsNeedingReview
              ? "Needs review"
              : status === "verified"
                ? "Ready for cash flow"
                : "Draft can be saved"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-left text-sm">
            <thead style={{ color: "var(--text-muted)" }}>
              <tr className="border-b" style={{ borderColor: "var(--glass-border)" }}>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Days worked</th>
                <th className="px-4 py-3 font-medium">Basic INR</th>
                <th className="px-4 py-3 font-medium">Special allowance INR</th>
                <th className="px-4 py-3 font-medium">Insurance INR</th>
                <th className="px-4 py-3 font-medium">Bonus INR</th>
                <th className="px-4 py-3 font-medium">PF INR</th>
                <th className="px-4 py-3 font-medium">TDS INR</th>
                <th className="px-4 py-3 font-medium">Monthly paid INR</th>
                <th className="px-4 py-3 font-medium">Actual paid INR</th>
                <th className="px-4 py-3 font-medium">Salary paid INR</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rowsWithTotals.map((row) => {
                return (
                  <tr key={row.employeeId} className="border-b" style={{ borderColor: "var(--glass-border)" }}>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{row.employeeName}</p>
                        {row.employeeIsActive === false ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              background: "rgba(248,113,113,0.12)",
                              color: "#fca5a5",
                              border: "1px solid rgba(248,113,113,0.25)",
                            }}
                          >
                            Inactive
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {row.source === "monthly-payroll" ? "Saved salary row" : "Employee default"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input
                        className={`${inputClass} w-28`}
                        type="number"
                        min="0"
                        max={row.daysInMonth}
                        step="0.01"
                        value={row.daysWorked}
                        onChange={(event) => {
                          const parsed = Number.parseFloat(event.currentTarget.value || "0");
                          updateRow(row.employeeId, {
                            daysWorked: normalizePayrollDaysWorked(parsed, row.daysInMonth),
                          });
                        }}
                        aria-label={`${row.employeeName} days worked`}
                      />
                      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        of {row.daysInMonth} days
                      </p>
                    </td>
                    {[
                      ["basicInrCents", "basic INR"],
                      ["specialAllowanceInrCents", "special allowance INR"],
                      ["insuranceInrCents", "insurance INR"],
                      ["bonusInrCents", "bonus INR"],
                    ].map(([key, label]) => (
                      <td key={key} className="px-4 py-3 align-top">
                        <input
                          className={`${inputClass} w-32`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={inrInputValue(row[key as keyof EditablePayrollRow] as number)}
                          onChange={(event) =>
                            updateRow(row.employeeId, {
                              [key]: centsFromInrInput(event.currentTarget.value),
                            } as Partial<EditablePayrollRow>)
                          }
                          aria-label={`${row.employeeName} ${label}`}
                        />
                      </td>
                    ))}
                  <td className="px-4 py-3 align-top">
                    <input
                      className={`${inputClass} w-28`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={inrInputValue(row.pfInrCents)}
                      onChange={(event) =>
                        updateRow(row.employeeId, {
                          pfInrCents: centsFromInrInput(event.currentTarget.value),
                        })
                      }
                      aria-label={`${row.employeeName} PF INR`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      className={`${inputClass} w-28`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={inrInputValue(row.tdsInrCents)}
                      onChange={(event) =>
                        updateRow(row.employeeId, {
                          tdsInrCents: centsFromInrInput(event.currentTarget.value),
                        })
                      }
                      aria-label={`${row.employeeName} TDS INR`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-semibold">{formatInr(row.monthlyPaidInrCents)}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-semibold">{formatInr(row.actualPaidInrCents)}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-semibold" style={{ color: row.needsReview ? "#fca5a5" : undefined }}>
                      {formatInr(row.salaryPaidInrCents)}
                    </p>
                    {row.needsReview ? (
                      <p className="mt-1 text-xs font-semibold" style={{ color: "#fca5a5" }}>
                        Needs review
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea
                      className={`${inputClass} min-h-20 w-48`}
                      value={row.notes}
                      onChange={(event) => updateRow(row.employeeId, { notes: event.currentTarget.value })}
                      aria-label={`${row.employeeName} notes`}
                    />
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PendingSubmitButton
        className="gradient-btn inline-flex items-center gap-2"
        defaultText="Save salary month"
        pendingText="Saving..."
        disabled={hasRowsNeedingReview}
      />
    </form>
  );
}
