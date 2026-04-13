"use client";

import { useMemo, useState } from "react";

import { inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { saveInvoicePaymentEmployeeEntriesAction } from "@/src/features/billing/actions";
import { calculateEmployeePayoutMetrics } from "@/src/features/billing/domain";
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
import {
  applyEmployeeCashFlowEntryPatch,
  buildAddedEmployeeCashFlowEntry,
  nextCashFlowClientBatchId,
  removeEntryFromSelections,
  resolveEmployeeToAddSelection,
} from "@/src/features/billing/employee-cash-flow-page-state";
import { formatInr, formatUsd } from "@/src/features/billing/utils";

type AvailableEmployee = {
  id: string;
  fullName: string;
  companyId: string;
  payoutMonthlyUsdCents: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  reimbursementLabelsText: string;
  appraisalAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
};

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

function deriveCardMetrics(entry: EmployeeCashFlowEditableEntry) {
  const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
    baseDollarInwardUsdCents: entry.baseDollarInwardUsdCents,
    onboardingAdvanceUsdCents: entry.onboardingAdvanceUsdCents,
    reimbursementUsdCents: entry.reimbursementUsdCents,
    appraisalAdvanceUsdCents: entry.appraisalAdvanceUsdCents,
    offboardingDeductionUsdCents: entry.offboardingDeductionUsdCents,
  });
  const cashInInrCents = calculateCashInInrCents({
    effectiveDollarInwardUsdCents,
    cashoutUsdInrRate: entry.cashoutUsdInrRate,
  });
  const payoutMetrics = calculateEmployeePayoutMetrics({
    dollarInwardUsdCents: effectiveDollarInwardUsdCents,
    employeeMonthlyUsdCents: entry.monthlyPaidUsdCents,
    cashoutUsdInrRate: entry.cashoutUsdInrRate,
    paidUsdInrRate: entry.paidUsdInrRate,
  });
  const actualPaidInrCents = entry.actualPaidInrCents;
  const netInrCents = calculateEmployeeMonthNetInrCents({
    cashInInrCents,
    salaryPaidInrCents: actualPaidInrCents,
  });

  return {
    effectiveDollarInwardUsdCents,
    cashInInrCents,
    salaryPaidInrCents: actualPaidInrCents,
    fxCommissionInrCents: payoutMetrics.fxCommissionInrCents,
    totalCommissionUsdCents: payoutMetrics.totalCommissionUsdCents,
    commissionEarnedInrCents: payoutMetrics.commissionEarnedInrCents,
    grossEarningsInrCents:
      payoutMetrics.fxCommissionInrCents + payoutMetrics.commissionEarnedInrCents,
    pendingAmountInrCents: cashInInrCents - actualPaidInrCents,
    netInrCents,
    status: resolveEmployeeCashFlowStatus({
      effectiveDollarInwardUsdCents,
      salaryPaidInrCents: actualPaidInrCents,
      netInrCents,
    }),
  };
}

function cardInputClass() {
  return `${inputClass} min-h-[56px] rounded-xl`;
}

export default function EmployeeCashFlowEntryForm({
  companyId,
  paymentMonth,
  returnTo,
  initialEntries,
  selectedInvoices,
}: {
  companyId: string;
  paymentMonth: string;
  returnTo: string;
  initialEntries: EmployeeCashFlowEditableEntry[];
  selectedInvoices: Array<{
    clientBatchId: string;
    batchLabel: string;
    invoicePaymentId?: string;
    invoiceId: string;
    invoiceNumber: string;
    invoiceUsdInrRate: number;
    availableEmployees: AvailableEmployee[];
  }>;
}) {
  const [entries, setEntries] = useState<EmployeeCashFlowEditableEntry[]>(
    aggregateEmployeeCashFlowEditableEntries(initialEntries),
  );
  const [invoiceBatches, setInvoiceBatches] = useState(selectedInvoices);
  const [invoiceToAdd, setInvoiceToAdd] = useState(invoiceBatches[0]?.clientBatchId ?? "");
  const activeInvoiceToAdd =
    invoiceBatches.find((invoice) => invoice.clientBatchId === invoiceToAdd) ??
    invoiceBatches[0];
  const [employeeToAdd, setEmployeeToAdd] = useState(
    activeInvoiceToAdd?.availableEmployees[0]?.id ?? "",
  );
  const [allEmployeesSelected, setAllEmployeesSelected] = useState(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    [...new Set(aggregateEmployeeCashFlowEditableEntries(initialEntries).map((entry) => entry.employeeId))],
  );

  const usedEmployeeIdsForInvoice = useMemo(
    () =>
      new Set(
        entries
          .filter((entry) => entry.clientBatchId === activeInvoiceToAdd?.clientBatchId)
          .map((entry) => entry.employeeId),
      ),
    [entries, activeInvoiceToAdd?.clientBatchId],
  );

  const addableEmployees = (activeInvoiceToAdd?.availableEmployees ?? []).filter(
    (employee) => !usedEmployeeIdsForInvoice.has(employee.id),
  );
  const resolvedEmployeeToAdd = resolveEmployeeToAddSelection(
    employeeToAdd,
    addableEmployees,
  );

  const visibleEntries = allEmployeesSelected
    ? entries
    : entries.filter((entry) => selectedEmployeeIds.includes(entry.employeeId));
  const employeeFilterOptions = [...new Map(
    entries.map((entry) => [entry.employeeId, entry.employeeNameSnapshot]),
  ).entries()];

  function updateEntry(id: string, patch: Partial<EmployeeCashFlowEditableEntry>) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? applyEmployeeCashFlowEntryPatch(entry, patch) : entry,
      ),
    );
  }

  function addEmployeeRow() {
    if (!activeInvoiceToAdd) return;
    const employee = addableEmployees.find(
      (row) => row.id === resolvedEmployeeToAdd,
    );
    if (!employee) return;

    const nextEntry: EmployeeCashFlowEditableEntry = {
      id: `manual_${activeInvoiceToAdd.invoiceId}_${employee.id}`,
      ...buildAddedEmployeeCashFlowEntry({
        employee,
        paymentMonth,
        invoiceId: activeInvoiceToAdd.invoiceId,
        invoiceNumber: activeInvoiceToAdd.invoiceNumber,
        invoiceUsdInrRate: activeInvoiceToAdd.invoiceUsdInrRate,
      }),
      clientBatchId: activeInvoiceToAdd.clientBatchId,
      invoicePaymentId: activeInvoiceToAdd.invoicePaymentId,
      batchLabel: activeInvoiceToAdd.batchLabel,
    };

    setEntries((current) => [...current, nextEntry]);
    setSelectedEmployeeIds((current) => [...new Set([...current, employee.id])]);
  }

  function removeEmployeeRow(entryId: string) {
    setEntries((current) =>
      removeEntryFromSelections({
        entries: current,
        selectedEmployeeIds,
        entryIdToRemove: entryId,
      }).entries,
    );
    setSelectedEmployeeIds((current) =>
      removeEntryFromSelections({
        entries,
        selectedEmployeeIds: current,
        entryIdToRemove: entryId,
      }).selectedEmployeeIds,
    );
  }

  function duplicateInvoiceBatch() {
    if (!activeInvoiceToAdd) return;

    const nextBatchId = nextCashFlowClientBatchId();
    const batchIndex =
      invoiceBatches.filter((batch) => batch.invoiceId === activeInvoiceToAdd.invoiceId).length + 1;
    const batchLabel = `${activeInvoiceToAdd.invoiceNumber} • Batch ${batchIndex}`;
    const duplicateBatch = {
      ...activeInvoiceToAdd,
      clientBatchId: nextBatchId,
      invoicePaymentId: undefined,
      batchLabel,
    };

    const clonedEntries = entries
      .filter((entry) => entry.clientBatchId === activeInvoiceToAdd.clientBatchId)
      .map((entry, index) => ({
        ...entry,
        id: `${entry.id}_dup_${index}_${nextBatchId}`,
        clientBatchId: nextBatchId,
        invoicePaymentId: undefined,
        batchLabel,
      }));

    setInvoiceBatches((current) => [...current, duplicateBatch]);
    setEntries((current) => [...current, ...clonedEntries]);
    setInvoiceToAdd(nextBatchId);
    setEmployeeToAdd(
      duplicateBatch.availableEmployees.find(
        (employee) => !clonedEntries.some((entry) => entry.employeeId === employee.id),
      )?.id ?? "",
    );
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
            Filter employees for {paymentMonth} across the selected invoices.
          </p>

          <label className="mt-4 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Employees (select one or more)
          </label>
          <select
            multiple
            value={
              allEmployeesSelected
                ? employeeFilterOptions.map(([employeeId]) => employeeId)
                : selectedEmployeeIds
            }
            onChange={(event) => {
              const values = Array.from(event.target.selectedOptions).map((option) => option.value);
              setSelectedEmployeeIds(values);
              setAllEmployeesSelected(values.length === employeeFilterOptions.length);
            }}
            className={cardInputClass()}
            style={{
              minHeight: "220px",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          >
            {employeeFilterOptions.map(([employeeId, employeeName]) => (
              <option key={employeeId} value={employeeId}>
                {employeeName}
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
                  setSelectedEmployeeIds(employeeFilterOptions.map(([employeeId]) => employeeId));
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
            Add a company employee to one selected invoice even if they had no inward on that invoice.
          </p>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Invoice
            </span>
            <select
              value={activeInvoiceToAdd?.clientBatchId ?? ""}
              onChange={(event) => {
                setInvoiceToAdd(event.target.value);
                const nextInvoice = invoiceBatches.find(
                  (invoice) => invoice.clientBatchId === event.target.value,
                );
                setEmployeeToAdd(nextInvoice?.availableEmployees[0]?.id ?? "");
              }}
              className={cardInputClass()}
              style={{
                border: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
              }}
            >
              {invoiceBatches.map((invoice) => (
                <option key={invoice.clientBatchId} value={invoice.clientBatchId}>
                  {invoice.batchLabel}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={duplicateInvoiceBatch}
            className="btn-outline mt-4"
            disabled={!activeInvoiceToAdd}
          >
            Add same invoice again
          </button>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Employee
            </span>
            <select
              value={resolvedEmployeeToAdd}
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
            disabled={!resolvedEmployeeToAdd}
          >
            Add employee row
          </button>
        </div>
      </div>

      <form action={saveInvoicePaymentEmployeeEntriesAction} className="space-y-4">
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="paymentMonth" value={paymentMonth} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input
          type="hidden"
          name="entriesJson"
          value={JSON.stringify(
            entries.map((entry) => {
              const metrics = deriveCardMetrics(entry);
              return {
                ...entry,
                fxCommissionInrCents: metrics.fxCommissionInrCents,
                totalCommissionUsdCents: metrics.totalCommissionUsdCents,
                commissionEarnedInrCents: metrics.commissionEarnedInrCents,
                grossEarningsInrCents: metrics.grossEarningsInrCents,
              };
            }),
          )}
        />

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
                    {entry.batchLabel ?? entry.invoiceNumber} · {paymentMonth}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => removeEmployeeRow(entry.id)}
                    className="rounded-xl border px-3 py-2 text-sm font-semibold"
                    style={{
                      borderColor: "rgba(248, 113, 113, 0.35)",
                      background: "rgba(248, 113, 113, 0.08)",
                      color: "#fca5a5",
                    }}
                  >
                    Remove row
                  </button>
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
                    inputMode="decimal"
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
                    inputMode="decimal"
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
                    inputMode="decimal"
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
                    inputMode="decimal"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Reimbursements / Expenses
                  </span>
                  <input
                    value={toCurrencyInput(entry.reimbursementUsdCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        reimbursementUsdCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                    inputMode="decimal"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Reimbursement labels
                  </span>
                  <input
                    value={entry.reimbursementLabelsText}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        reimbursementLabelsText: event.target.value,
                      })
                    }
                    className={cardInputClass()}
                    inputMode="decimal"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Appraisal advance
                  </span>
                  <input
                    value={toCurrencyInput(entry.appraisalAdvanceUsdCents)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        appraisalAdvanceUsdCents: fromCurrencyInput(event.target.value),
                      })
                    }
                    className={cardInputClass()}
                    inputMode="decimal"
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
                    inputMode="decimal"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Cashout USD/INR
                  </span>
                  <input
                    value={toEditableRate(entry.cashoutUsdInrRate)}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        cashoutUsdInrRate: Number.parseFloat(event.target.value || "0") || 0,
                      })
                    }
                    className={cardInputClass()}
                    inputMode="decimal"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Paid USD/INR
                  </span>
                  <input
                    value={toEditableRate(entry.paidUsdInrRate)}
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
                    inputMode="decimal"
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
                    value={toCurrencyInput(metrics.fxCommissionInrCents)}
                    className={cardInputClass()}
                    readOnly
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Total commission (USD)
                  </span>
                  <input
                    value={toCurrencyInput(metrics.totalCommissionUsdCents)}
                    className={cardInputClass()}
                    readOnly
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Commission earned (INR)
                  </span>
                  <input
                    value={toCurrencyInput(metrics.commissionEarnedInrCents)}
                    className={cardInputClass()}
                    readOnly
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Gross earnings (INR)
                  </span>
                  <input
                    value={toCurrencyInput(metrics.grossEarningsInrCents)}
                    className={cardInputClass()}
                    readOnly
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
                  ["Reimbursements / Expenses INR", formatInr(Math.round(entry.reimbursementUsdCents * entry.cashoutUsdInrRate))],
                  ["Appraisal advance INR", formatInr(Math.round(entry.appraisalAdvanceUsdCents * entry.cashoutUsdInrRate))],
                  ["Cash in INR", formatInr(metrics.cashInInrCents)],
                  ["Total paid INR", formatInr(metrics.salaryPaidInrCents)],
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

              <div className="mt-4 flex justify-end">
                <PendingSubmitButton
                  className="btn-outline"
                  defaultText="Update row"
                  pendingText="Updating row..."
                />
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
