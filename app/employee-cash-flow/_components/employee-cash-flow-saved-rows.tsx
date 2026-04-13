"use client";

import { useMemo, useState } from "react";

import { inputClass } from "@/app/_components/field";
import {
  deleteSavedEmployeeCashFlowEntryAction,
  updateSavedEmployeeCashFlowEntryAction,
} from "@/src/features/billing/actions";
import { calculateActualPaidInrCents } from "@/src/features/billing/employee-cash-flow";
import type { EmployeeCashFlowSavedEntry } from "@/src/features/billing/employee-cash-flow-types";
import { formatInr } from "@/src/features/billing/utils";

function toCurrencyInput(value: number) {
  const formatted = (value / 100).toFixed(2);
  return formatted.replace(/\.00$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
}

function fromCurrencyInput(value: string) {
  const parsed = Number.parseFloat(value || "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function toEditableRate(value: number) {
  const formatted = value.toFixed(4);
  return formatted.replace(/\.?0+$/, "");
}

function formatPaymentMonth(paymentMonth: string) {
  const [year, month] = paymentMonth.split("-").map((value) => Number(value));
  if (!year || !month) {
    return paymentMonth;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default function EmployeeCashFlowSavedRows({
  initialRows,
  returnTo,
}: {
  initialRows: EmployeeCashFlowSavedEntry[];
  returnTo: string;
}) {
  const [rows, setRows] = useState(initialRows);

  const grouped = useMemo(() => {
    const employeeMap = new Map<
      string,
      { employeeName: string; months: Map<string, EmployeeCashFlowSavedEntry[]> }
    >();

    for (const row of rows) {
      const employeeGroup =
        employeeMap.get(row.employeeId) ??
        {
          employeeName: row.employeeNameSnapshot,
          months: new Map<string, EmployeeCashFlowSavedEntry[]>(),
        };
      const monthRows = employeeGroup.months.get(row.paymentMonth) ?? [];
      monthRows.push(row);
      employeeGroup.months.set(row.paymentMonth, monthRows);
      employeeMap.set(row.employeeId, employeeGroup);
    }

    return [...employeeMap.entries()]
      .map(([employeeId, employeeGroup]) => ({
        employeeId,
        employeeName: employeeGroup.employeeName,
        months: [...employeeGroup.months.entries()].sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      }))
      .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
  }, [rows]);

  function updateRow(id: string, patch: Partial<EmployeeCashFlowSavedEntry>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-sm"
        style={{ border: "1px solid var(--glass-border)", color: "var(--text-muted)" }}
      >
        No saved employee cash flow rows for this company.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map((employeeGroup) => (
        <div
          key={employeeGroup.employeeId}
          className="rounded-2xl p-4"
          style={{ border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}
        >
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {employeeGroup.employeeName}
          </h3>

          <div className="mt-4 space-y-4">
            {employeeGroup.months.map(([month, monthRows]) => (
              <div key={`${employeeGroup.employeeId}-${month}`} className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {formatPaymentMonth(month)}
                </p>

                <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
                  <table className="glass-table min-w-[1500px]">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Days worked</th>
                        <th>Monthly Paid $</th>
                        <th>Dollar inward</th>
                        <th>Onboarding</th>
                        <th>Reimbursements</th>
                        <th>Labels</th>
                        <th>Appraisal</th>
                        <th>Offboarding</th>
                        <th>Cashout</th>
                        <th>Paid USD/INR</th>
                        <th>Total paid INR</th>
                        <th>PF INR</th>
                        <th>TDS INR</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((row) => {
                        const actualPaidInrCents = calculateActualPaidInrCents({
                          daysWorked: row.daysWorked,
                          monthlyPaidUsdCents: row.monthlyPaidUsdCents,
                          paidUsdInrRate: row.paidUsdInrRate,
                        });

                        return (
                          <tr key={row.id}>
                            <td>{formatPaymentMonth(row.paymentMonth)}</td>
                            <td>
                              <input
                                value={String(row.daysWorked)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    daysWorked:
                                      Number.parseInt(event.target.value || "0", 10) || 0,
                                  })
                                }
                                className={inputClass}
                              />
                            </td>
                            <td>
                              <input
                                value={toCurrencyInput(row.monthlyPaidUsdCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    monthlyPaidUsdCents: fromCurrencyInput(event.target.value),
                                  })
                                }
                                className={inputClass}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={toCurrencyInput(row.baseDollarInwardUsdCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    baseDollarInwardUsdCents: fromCurrencyInput(
                                      event.target.value,
                                    ),
                                  })
                                }
                                className={inputClass}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={toCurrencyInput(row.onboardingAdvanceUsdCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    onboardingAdvanceUsdCents: fromCurrencyInput(
                                      event.target.value,
                                    ),
                                  })
                                }
                                className={inputClass}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={toCurrencyInput(row.reimbursementUsdCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    reimbursementUsdCents: fromCurrencyInput(
                                      event.target.value,
                                    ),
                                  })
                                }
                                className={inputClass}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={row.reimbursementLabelsText}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    reimbursementLabelsText: event.target.value,
                                  })
                                }
                                className={inputClass}
                              />
                            </td>
                            <td>
                              <input
                                value={toCurrencyInput(row.appraisalAdvanceUsdCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    appraisalAdvanceUsdCents: fromCurrencyInput(
                                      event.target.value,
                                    ),
                                  })
                                }
                                className={inputClass}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={toCurrencyInput(row.offboardingDeductionUsdCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    offboardingDeductionUsdCents: fromCurrencyInput(
                                      event.target.value,
                                    ),
                                  })
                                }
                                className={inputClass}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={toEditableRate(row.cashoutUsdInrRate)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    cashoutUsdInrRate:
                                      Number.parseFloat(event.target.value || "0") || 0,
                                  })
                                }
                                className={inputClass}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={toEditableRate(row.paidUsdInrRate)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    paidUsdInrRate:
                                      Number.parseFloat(event.target.value || "0") || 0,
                                  })
                                }
                                className={inputClass}
                                inputMode="decimal"
                              />
                            </td>
                            <td>{formatInr(actualPaidInrCents)}</td>
                            <td>
                              <input
                                value={toCurrencyInput(row.pfInrCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    pfInrCents: fromCurrencyInput(event.target.value),
                                  })
                                }
                                className={inputClass}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={toCurrencyInput(row.tdsInrCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    tdsInrCents: fromCurrencyInput(event.target.value),
                                  })
                                }
                                className={inputClass}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={row.notes ?? ""}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    notes: event.target.value,
                                  })
                                }
                                className={inputClass}
                              />
                            </td>
                            <td>
                              <form action={updateSavedEmployeeCashFlowEntryAction} className="flex gap-2">
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <input
                                  type="hidden"
                                  name="entryJson"
                                  value={JSON.stringify({
                                    ...row,
                                    actualPaidInrCents,
                                  })}
                                />
                                <button type="submit" className="btn-outline">
                                  Update
                                </button>
                                <button
                                  type="submit"
                                  formAction={deleteSavedEmployeeCashFlowEntryAction}
                                  className="btn-outline"
                                  name="entryId"
                                  value={row.id}
                                >
                                  Remove
                                </button>
                              </form>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
