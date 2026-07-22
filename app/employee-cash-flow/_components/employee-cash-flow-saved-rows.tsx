"use client";

import { useMemo, useState } from "react";

import { inputClass } from "../../_components/field";
import {
  deleteSavedEmployeeCashFlowEntryAction,
  updateSavedEmployeeCashFlowEntryAction,
} from "../../../src/features/billing/actions";
import { calculateEffectiveDollarInwardUsdCents } from "../../../src/features/billing/employee-cash-flow";
import type { EmployeeCashFlowSavedEntry } from "../../../src/features/billing/employee-cash-flow-types";
import {
  buildSavedEmployeeCashFlowEntryJson,
  formatSavedPaymentMonth,
} from "../../../src/features/billing/employee-cash-flow-saved-rows-helpers";
import { calculateSalaryPaidInrCents } from "../../../src/features/billing/payroll";
import {
  formatInr,
  formatRateInput,
  formatUsd,
  formatWholeRateInput,
} from "../../../src/features/billing/utils";

function toCurrencyInput(value: number) {
  const formatted = (value / 100).toFixed(2);
  return formatted.replace(/\.00$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
}

function fromCurrencyInput(value: string) {
  const parsed = Number.parseFloat(value || "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
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
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        try {
          next.salaryPaidInrCents = calculateSalaryPaidInrCents({
            actualPaidInrCents: next.actualPaidInrCents,
            pfInrCents: next.pfInrCents,
            tdsInrCents: next.tdsInrCents,
          });
        } catch {
          next.salaryPaidInrCents = 0;
        }
        return next;
      }),
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
                  {formatSavedPaymentMonth(month)}
                </p>

                <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
                  <table className="glass-table min-w-[1900px]">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Days worked</th>
                        <th>Dollar inward</th>
                        <th>Onboarding advance USD</th>
                        <th>Reimbursements USD</th>
                        <th>Labels</th>
                        <th>Appraisal advance USD</th>
                        <th>Offboarding deduction USD</th>
                        <th>Final effective inward $</th>
                        <th>Received / exchanged rate</th>
                        <th>Peg rate</th>
                        <th>Monthly paid INR</th>
                        <th>Actual paid INR</th>
                        <th>PF INR</th>
                        <th>TDS INR</th>
                        <th>Salary paid INR</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((row) => {
                        const finalEffectiveDollarInwardUsdCents =
                          calculateEffectiveDollarInwardUsdCents({
                            baseDollarInwardUsdCents: row.baseDollarInwardUsdCents,
                            onboardingAdvanceUsdCents: row.onboardingAdvanceUsdCents,
                            reimbursementUsdCents: row.reimbursementUsdCents,
                            appraisalAdvanceUsdCents: row.appraisalAdvanceUsdCents,
                            offboardingDeductionUsdCents: row.offboardingDeductionUsdCents,
                          });

                        return (
                          <tr key={row.id}>
                            <td>{formatSavedPaymentMonth(row.paymentMonth)}</td>
                            <td>
                              <input
                                value={String(row.daysWorked)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    daysWorked:
                                      Number.parseInt(event.target.value || "0", 10) || 0,
                                  })
                                }
                                className={`${inputClass} min-w-[6rem]`}
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
                                className={`${inputClass} min-w-[8rem]`}
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
                                className={`${inputClass} min-w-[8rem]`}
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
                                className={`${inputClass} min-w-[8rem]`}
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
                                className={`${inputClass} min-w-[14rem]`}
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
                                className={`${inputClass} min-w-[8rem]`}
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
                                className={`${inputClass} min-w-[8rem]`}
                                inputMode="decimal"
                              />
                            </td>
                            <td className="font-semibold">
                              {formatUsd(finalEffectiveDollarInwardUsdCents)}
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={formatRateInput(row.cashoutUsdInrRate)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    cashoutUsdInrRate:
                                      Number.parseFloat(event.target.value || "0") || 0,
                                  })
                                }
                                className={`${inputClass} min-w-[7rem]`}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="1"
                                value={formatWholeRateInput(row.paidUsdInrRate)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    paidUsdInrRate:
                                      Number.parseFloat(event.target.value || "0") || 0,
                                  })
                                }
                                className={`${inputClass} min-w-[7rem]`}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={toCurrencyInput(row.monthlyPaidInrCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    monthlyPaidInrCents: fromCurrencyInput(event.target.value),
                                  })
                                }
                                className={`${inputClass} min-w-[8rem]`}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={toCurrencyInput(row.actualPaidInrCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    actualPaidInrCents: fromCurrencyInput(event.target.value),
                                  })
                                }
                                className={`${inputClass} min-w-[8rem]`}
                                inputMode="decimal"
                              />
                            </td>
                            <td>
                              <input
                                value={toCurrencyInput(row.pfInrCents)}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    pfInrCents: fromCurrencyInput(event.target.value),
                                  })
                                }
                                className={`${inputClass} min-w-[8rem]`}
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
                                className={`${inputClass} min-w-[8rem]`}
                                inputMode="decimal"
                              />
                            </td>
                            <td className="font-semibold">{formatInr(row.salaryPaidInrCents)}</td>
                            <td>
                              <input
                                value={row.notes ?? ""}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    notes: event.target.value,
                                  })
                                }
                                className={`${inputClass} min-w-[16rem]`}
                              />
                            </td>
                            <td>
                              <form action={updateSavedEmployeeCashFlowEntryAction} className="flex gap-2">
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <input type="hidden" name="entryId" value={row.id} />
                                <input
                                  type="hidden"
                                  name="entryJson"
                                  value={buildSavedEmployeeCashFlowEntryJson(row)}
                                />
                                <button type="submit" className="btn-outline">
                                  Update
                                </button>
                                <button
                                  type="submit"
                                  formAction={deleteSavedEmployeeCashFlowEntryAction}
                                  className="btn-outline"
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
