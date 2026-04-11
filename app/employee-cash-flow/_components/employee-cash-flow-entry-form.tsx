"use client";

import { useMemo, useState } from "react";

import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { inputClass } from "@/app/_components/field";
import { saveInvoicePaymentEmployeeEntriesAction } from "@/src/features/billing/actions";
import type { EmployeeCashFlowEntryWriteInput } from "@/src/features/billing/employee-cash-flow-types";

type AvailableEmployee = {
  id: string;
  fullName: string;
  companyId: string;
  payoutMonthlyUsdCents: number;
};

type PrefillEntry = EmployeeCashFlowEntryWriteInput & {
  id: string;
};

function toCurrencyInput(value: number) {
  return (value / 100).toFixed(2);
}

function fromCurrencyInput(value: string) {
  const parsed = Number.parseFloat(value || "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

export default function EmployeeCashFlowEntryForm({
  invoicePaymentId,
  invoiceId,
  companyId,
  paymentMonth,
  returnTo,
  initialEntries,
  availableEmployees,
}: {
  invoicePaymentId?: string;
  invoiceId: string;
  companyId: string;
  paymentMonth: string;
  returnTo: string;
  initialEntries: PrefillEntry[];
  availableEmployees: AvailableEmployee[];
}) {
  const [entries, setEntries] = useState<PrefillEntry[]>(initialEntries);
  const [employeeToAdd, setEmployeeToAdd] = useState(availableEmployees[0]?.id ?? "");

  const usedEmployeeIds = useMemo(
    () => new Set(entries.map((entry) => entry.employeeId)),
    [entries],
  );
  const addableEmployees = availableEmployees.filter(
    (employee) => !usedEmployeeIds.has(employee.id),
  );

  function updateEntry(index: number, patch: Partial<PrefillEntry>) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function addEmployeeRow() {
    const employee = addableEmployees.find((row) => row.id === employeeToAdd);
    if (!employee) return;

    setEntries((current) => [
      ...current,
      {
        id: `manual_${employee.id}`,
        employeeId: employee.id,
        employeeNameSnapshot: employee.fullName,
        daysWorked: 0,
        daysInMonth: 30,
        monthlyPaidUsdCents: employee.payoutMonthlyUsdCents,
        baseDollarInwardUsdCents: 0,
        onboardingAdvanceUsdCents: 0,
        offboardingDeductionUsdCents: 0,
        cashoutUsdInrRate: 0,
        paidUsdInrRate: 0,
        pfInrCents: 0,
        tdsInrCents: 0,
        actualPaidInrCents: 0,
        fxCommissionInrCents: 0,
        totalCommissionUsdCents: 0,
        commissionEarnedInrCents: 0,
        grossEarningsInrCents: 0,
        isNonInvoiceEmployee: true,
        isPaid: false,
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-72">
          <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Add employee
          </span>
          <select
            value={employeeToAdd}
            onChange={(event) => setEmployeeToAdd(event.target.value)}
            className={inputClass}
            style={{
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
            disabled={addableEmployees.length === 0}
          >
            {addableEmployees.length === 0 ? (
              <option value="">All company employees are already in this cash flow list</option>
            ) : (
              addableEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))
            )}
          </select>
        </label>
        <button type="button" onClick={addEmployeeRow} className="btn-outline" disabled={!employeeToAdd}>
          Add employee row
        </button>
      </div>

      <form action={saveInvoicePaymentEmployeeEntriesAction} className="space-y-4">
        <input type="hidden" name="invoicePaymentId" value={invoicePaymentId ?? ""} />
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="paymentMonth" value={paymentMonth} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="entriesJson" value={JSON.stringify(entries)} />

        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Days Worked</th>
                <th>Monthly Paid $</th>
                <th>Dollar Inward</th>
                <th>Onboarding Advance</th>
                <th>Offboarding Deduction</th>
                <th>Cashout USD/INR</th>
                <th>Paid USD/INR</th>
                <th>PF (INR)</th>
                <th>TDS (INR)</th>
                <th>Actual Paid (INR)</th>
                <th>FX Commission (INR)</th>
                <th>Total Commission (USD)</th>
                <th>Commission Earned (INR)</th>
                <th>Gross Earnings (INR)</th>
                <th>Paid?</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.id}>
                  <td>{entry.employeeNameSnapshot}</td>
                  <td>
                    <input
                      value={String(entry.daysWorked)}
                      onChange={(event) =>
                        updateEntry(index, {
                          daysWorked: Number.parseInt(event.target.value || "0", 10) || 0,
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.monthlyPaidUsdCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          monthlyPaidUsdCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.baseDollarInwardUsdCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          baseDollarInwardUsdCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.onboardingAdvanceUsdCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          onboardingAdvanceUsdCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.offboardingDeductionUsdCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          offboardingDeductionUsdCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={String(entry.cashoutUsdInrRate)}
                      onChange={(event) =>
                        updateEntry(index, {
                          cashoutUsdInrRate: Number.parseFloat(event.target.value || "0") || 0,
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={String(entry.paidUsdInrRate)}
                      onChange={(event) =>
                        updateEntry(index, {
                          paidUsdInrRate: Number.parseFloat(event.target.value || "0") || 0,
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.pfInrCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          pfInrCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.tdsInrCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          tdsInrCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.actualPaidInrCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          actualPaidInrCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.fxCommissionInrCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          fxCommissionInrCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.totalCommissionUsdCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          totalCommissionUsdCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.commissionEarnedInrCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          commissionEarnedInrCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      value={toCurrencyInput(entry.grossEarningsInrCents)}
                      onChange={(event) =>
                        updateEntry(index, {
                          grossEarningsInrCents: fromCurrencyInput(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={entry.isPaid}
                      onChange={(event) =>
                        updateEntry(index, {
                          isPaid: event.target.checked,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PendingSubmitButton
          className="gradient-btn"
          defaultText="Save employee cash flow rows"
          pendingText="Saving rows..."
        />
      </form>
    </div>
  );
}
