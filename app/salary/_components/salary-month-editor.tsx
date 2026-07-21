"use client";

import { useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";

import { Field, inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { saveMonthlyPayrollRowsAction } from "@/src/features/billing/actions";
import {
  calculateActualPaidInrCents,
  normalizePayrollDaysWorked,
  summarizePayrollRows,
  type MonthlyPayrollRow,
  type PayrollStatus,
} from "@/src/features/billing/payroll";
import { formatInr } from "@/src/features/billing/utils";

type EditablePayrollRow = MonthlyPayrollRow & {
  notes: string;
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
  const [editableRows, setEditableRows] = useState(() => rows.map(toEditableRow));
  const summary = useMemo(
    () =>
      summarizePayrollRows(
        editableRows.map((row) => ({
          ...row,
          salaryPaidInrCents: calculateActualPaidInrCents({
            monthlyPaidInrCents: row.monthlyPaidInrCents,
            daysWorked: row.daysWorked,
            daysInMonth: row.daysInMonth,
          }),
        })),
      ),
    [editableRows],
  );
  const rowsJson = useMemo(
    () =>
      JSON.stringify(
        editableRows.map((row) => ({
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          monthlyPaidInrCents: row.monthlyPaidInrCents,
          daysWorked: row.daysWorked,
          daysInMonth: row.daysInMonth,
          salaryPaidInrCents: calculateActualPaidInrCents({
            monthlyPaidInrCents: row.monthlyPaidInrCents,
            daysWorked: row.daysWorked,
            daysInMonth: row.daysInMonth,
          }),
          pfInrCents: row.pfInrCents,
          tdsInrCents: row.tdsInrCents,
          notes: row.notes,
        })),
      ),
    [editableRows],
  );

  function updateRow(employeeId: string, patch: Partial<EditablePayrollRow>) {
    setEditableRows((current) =>
      current.map((row) => (row.employeeId === employeeId ? { ...row, ...patch } : row)),
    );
  }

  return (
    <form action={saveMonthlyPayrollRowsAction} className="space-y-5">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="rowsJson" value={rowsJson} />

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
          <p className="mt-1 text-lg font-semibold">{formatInr(summary.salaryPaidInrCents)}</p>
        </div>

        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--glass-border)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Net after PF/TDS</p>
          <p className="mt-1 text-lg font-semibold">{formatInr(summary.netPaidInrCents)}</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--glass-border)" }}>
          <div>
            <h2 className="text-lg font-semibold">Salary sheet</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {summary.employeeCount} employees - PF {formatInr(summary.pfInrCents)} - TDS {formatInr(summary.tdsInrCents)}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full px-3 py-1 text-xs" style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--text-accent)" }}>
            <BadgeCheck className="h-4 w-4" />
            {status === "verified" ? "Ready for cash flow" : "Draft can be saved"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead style={{ color: "var(--text-muted)" }}>
              <tr className="border-b" style={{ borderColor: "var(--glass-border)" }}>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Days worked</th>
                <th className="px-4 py-3 font-medium">Monthly paid INR</th>
                <th className="px-4 py-3 font-medium">Actual paid INR</th>
                <th className="px-4 py-3 font-medium">PF INR</th>
                <th className="px-4 py-3 font-medium">TDS INR</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {editableRows.map((row) => {
                const actualPaidInrCents = calculateActualPaidInrCents({
                  monthlyPaidInrCents: row.monthlyPaidInrCents,
                  daysWorked: row.daysWorked,
                  daysInMonth: row.daysInMonth,
                });

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
                    <td className="px-4 py-3 align-top">
                      <input
                        className={`${inputClass} w-36`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={inrInputValue(row.monthlyPaidInrCents)}
                        onChange={(event) =>
                          updateRow(row.employeeId, {
                            monthlyPaidInrCents: centsFromInrInput(event.currentTarget.value),
                          })
                        }
                        aria-label={`${row.employeeName} monthly paid INR`}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold">{formatInr(actualPaidInrCents)}</p>
                    </td>
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
      />
    </form>
  );
}
