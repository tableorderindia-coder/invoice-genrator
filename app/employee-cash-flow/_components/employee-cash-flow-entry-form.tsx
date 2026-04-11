"use client";

import { useMemo, useState } from "react";

import { inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { saveInvoicePaymentEmployeeEntriesAction } from "@/src/features/billing/actions";
import {
  calculateCashInInrCents,
  calculateEffectiveDollarInwardUsdCents,
  calculateEmployeeMonthNetInrCents,
  resolveEmployeeCashFlowStatus,
} from "@/src/features/billing/employee-cash-flow";
import {
  aggregateEmployeeCashFlowEditableEntries,
  type EmployeeCashFlowEditableEntry,
} from "@/src/features/billing/employee-cash-flow-entry-aggregation";
import { formatInr, formatUsd } from "@/src/features/billing/utils";

type AvailableEmployee = {
  id: string;
  fullName: string;
  companyId: string;
  payoutMonthlyUsdCents: number;
};

function toCurrencyInput(value: number) {
  return (value / 100).toFixed(2);
}

function fromCurrencyInput(value: string) {
  const parsed = Number.parseFloat(value || "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function deriveCardMetrics(entry: EmployeeCashFlowEditableEntry) {
  const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
    baseDollarInwardUsdCents: entry.baseDollarInwardUsdCents,
    onboardingAdvanceUsdCents: entry.onboardingAdvanceUsdCents,
    offboardingDeductionUsdCents: entry.offboardingDeductionUsdCents,
  });
  const cashInInrCents = calculateCashInInrCents({
    effectiveDollarInwardUsdCents,
    cashoutUsdInrRate: entry.cashoutUsdInrRate,
  });
  const salaryPaidInrCents = calculateCashInInrCents({
    effectiveDollarInwardUsdCents: entry.monthlyPaidUsdCents,
    cashoutUsdInrRate: entry.paidUsdInrRate,
  });
  const netInrCents = calculateEmployeeMonthNetInrCents({
    cashInInrCents,
    salaryPaidInrCents,
  });

  return {
    effectiveDollarInwardUsdCents,
    cashInInrCents,
    salaryPaidInrCents,
    pendingAmountInrCents: cashInInrCents - entry.actualPaidInrCents,
    netInrCents,
    status: resolveEmployeeCashFlowStatus({
      effectiveDollarInwardUsdCents,
      salaryPaidInrCents,
      netInrCents,
    }),
  };
}

function cardInputClass() {
  return `${inputClass} min-h-[56px] rounded-xl`;
}

export default function EmployeeCashFlowEntryForm({
  invoicePaymentId,
  invoiceId,
  companyId,
  paymentMonth,
  returnTo,
  invoiceNumber,
  initialEntries,
  availableEmployees,
}: {
  invoicePaymentId?: string;
  invoiceId: string;
  companyId: string;
  paymentMonth: string;
  returnTo: string;
  invoiceNumber: string;
  initialEntries: EmployeeCashFlowEditableEntry[];
  availableEmployees: AvailableEmployee[];
}) {
  const [entries, setEntries] = useState<EmployeeCashFlowEditableEntry[]>(
    aggregateEmployeeCashFlowEditableEntries(initialEntries),
  );
  const [employeeToAdd, setEmployeeToAdd] = useState(availableEmployees[0]?.id ?? "");
  const [allEmployeesSelected, setAllEmployeesSelected] = useState(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    aggregateEmployeeCashFlowEditableEntries(initialEntries).map((entry) => entry.employeeId),
  );

  const usedEmployeeIds = useMemo(
    () => new Set(entries.map((entry) => entry.employeeId)),
    [entries],
  );

  const addableEmployees = availableEmployees.filter(
    (employee) => !usedEmployeeIds.has(employee.id),
  );

  const visibleEntries = allEmployeesSelected
    ? entries
    : entries.filter((entry) => selectedEmployeeIds.includes(entry.employeeId));

  function updateEntry(id: string, patch: Partial<EmployeeCashFlowEditableEntry>) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }

  function addEmployeeRow() {
    const employee = addableEmployees.find((row) => row.id === employeeToAdd);
    if (!employee) return;

    const nextEntry: EmployeeCashFlowEditableEntry = {
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
      notes: "",
    };

    setEntries((current) => [...current, nextEntry]);
    setSelectedEmployeeIds((current) => [...new Set([...current, employee.id])]);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div
          className="rounded-2xl p-5"
          style={{ border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Employee Monthly View
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Filter employees for {paymentMonth} on invoice {invoiceNumber}.
          </p>

          <label className="mt-4 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Employees (select one or more)
          </label>
          <select
            multiple
            value={allEmployeesSelected ? entries.map((entry) => entry.employeeId) : selectedEmployeeIds}
            onChange={(event) => {
              const values = Array.from(event.target.selectedOptions).map((option) => option.value);
              setSelectedEmployeeIds(values);
              setAllEmployeesSelected(values.length === entries.length);
            }}
            className={cardInputClass()}
            style={{
              minHeight: "220px",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          >
            {entries.map((entry) => (
              <option key={entry.employeeId} value={entry.employeeId}>
                {entry.employeeNameSnapshot}
              </option>
            ))}
          </select>

          <label className="mt-4 inline-flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <input
              type="checkbox"
              checked={allEmployeesSelected}
              onChange={(event) => {
                const checked = event.target.checked;
                setAllEmployeesSelected(checked);
                if (checked) {
                  setSelectedEmployeeIds(entries.map((entry) => entry.employeeId));
                }
              }}
            />
            Select all employees
          </label>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Add employee
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Add a company employee even if they had no inward on this invoice.
          </p>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Employee
            </span>
            <select
              value={employeeToAdd}
              onChange={(event) => setEmployeeToAdd(event.target.value)}
              className={cardInputClass()}
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

          <button
            type="button"
            onClick={addEmployeeRow}
            className="btn-outline mt-4"
            disabled={!employeeToAdd}
          >
            Add employee row
          </button>
        </div>
      </div>

      <form action={saveInvoicePaymentEmployeeEntriesAction} className="space-y-4">
        <input type="hidden" name="invoicePaymentId" value={invoicePaymentId ?? ""} />
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="paymentMonth" value={paymentMonth} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="entriesJson" value={JSON.stringify(entries)} />

        {visibleEntries.map((entry) => {
          const metrics = deriveCardMetrics(entry);

          return (
            <div
              key={entry.id}
              className="rounded-2xl p-5"
              style={{ border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.03)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                    {entry.employeeNameSnapshot}
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {invoiceNumber} · {paymentMonth}
                  </p>
                </div>
                <div
                  className="rounded-xl px-3 py-2 text-sm font-semibold"
                  style={{
                    background:
                      metrics.status === "profit"
                        ? "rgba(16, 185, 129, 0.12)"
                        : "rgba(248, 113, 113, 0.12)",
                    color:
                      metrics.status === "waiting_for_payment"
                        ? "#fca5a5"
                        : metrics.status === "loss"
                          ? "#f87171"
                          : "#6ee7b7",
                  }}
                >
                  {metrics.status === "waiting_for_payment"
                    ? "Waiting for Payment"
                    : metrics.status === "loss"
                      ? "LOSS"
                      : "PROFIT"}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Days worked
                  </span>
                  <input
                    value={String(entry.daysWorked)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        daysWorked: Number.parseInt(event.target.value || "0", 10) || 0,
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Monthly Paid $
                  </span>
                  <input
                    value={toCurrencyInput(entry.monthlyPaidUsdCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        monthlyPaidUsdCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Dollar inward
                  </span>
                  <input
                    value={toCurrencyInput(entry.baseDollarInwardUsdCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        baseDollarInwardUsdCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Onboarding advance
                  </span>
                  <input
                    value={toCurrencyInput(entry.onboardingAdvanceUsdCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        onboardingAdvanceUsdCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Offboarding deduction
                  </span>
                  <input
                    value={toCurrencyInput(entry.offboardingDeductionUsdCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        offboardingDeductionUsdCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Cashout USD/INR
                  </span>
                  <input
                    value={String(entry.cashoutUsdInrRate)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        cashoutUsdInrRate: Number.parseFloat(event.target.value || "0") || 0,
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Paid USD/INR
                  </span>
                  <input
                    value={String(entry.paidUsdInrRate)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        paidUsdInrRate: Number.parseFloat(event.target.value || "0") || 0,
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Actual paid (INR)
                  </span>
                  <input
                    value={toCurrencyInput(entry.actualPaidInrCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        actualPaidInrCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    PF (INR)
                  </span>
                  <input
                    value={toCurrencyInput(entry.pfInrCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        pfInrCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    TDS (INR)
                  </span>
                  <input
                    value={toCurrencyInput(entry.tdsInrCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        tdsInrCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    FX commission (INR)
                  </span>
                  <input
                    value={toCurrencyInput(entry.fxCommissionInrCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        fxCommissionInrCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Total commission (USD)
                  </span>
                  <input
                    value={toCurrencyInput(entry.totalCommissionUsdCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        totalCommissionUsdCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Commission earned (INR)
                  </span>
                  <input
                    value={toCurrencyInput(entry.commissionEarnedInrCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        commissionEarnedInrCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Gross earnings (INR)
                  </span>
                  <input
                    value={toCurrencyInput(entry.grossEarningsInrCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        grossEarningsInrCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Paid date
                  </span>
                  <input
                    type="date"
                    value={entry.paidAt ?? ""}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        paidAt: event.target.value || undefined,
                      })
                    }
                    className={cardInputClass()}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Mark as paid
                  </span>
                  <div
                    className="flex min-h-[56px] items-center rounded-xl px-4"
                    style={{ border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)" }}
                  >
                    <label className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <input
                        type="checkbox"
                        checked={entry.isPaid}
                        onChange={(event) =>
                          updateEntry(entry.id, {
                            isPaid: event.target.checked,
                          })
                        }
                      />
                      Paid this month
                    </label>
                  </div>
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Notes
                </span>
                <textarea
                  value={entry.notes ?? ""}
                  onChange={(event) =>
                    updateEntry(entry.id, {
                      notes: event.target.value,
                    })
                  }
                  rows={3}
                  className={cardInputClass()}
                />
              </label>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Effective inward", formatUsd(metrics.effectiveDollarInwardUsdCents)],
                  ["Cash in INR", formatInr(metrics.cashInInrCents)],
                  ["Salary paid INR", formatInr(metrics.salaryPaidInrCents)],
                  ["Pending amount", formatInr(metrics.pendingAmountInrCents)],
                  ["Net result", formatInr(metrics.netInrCents)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl px-4 py-3"
                    style={{ border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)" }}
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                      {label}
                    </p>
                    <p className="mt-2 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {visibleEntries.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-sm"
            style={{ border: "1px solid var(--glass-border)", color: "var(--text-muted)" }}
          >
            No employees selected for this monthly cash view.
          </div>
        ) : null}

        <PendingSubmitButton
          className="gradient-btn"
          defaultText="Save employee cash flow rows"
          pendingText="Saving rows..."
        />
      </form>
    </div>
  );
}
