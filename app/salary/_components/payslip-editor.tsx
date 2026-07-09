"use client";

import { useMemo, useState } from "react";
import { Download, FileArchive, Plus, Trash2 } from "lucide-react";

import { Field, inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { preparePayslipsAction, savePayslipAction } from "@/src/features/billing/actions";
import type { PayslipAmountRow, PayslipTaxPaidMonth, PayslipTdsEarningRow } from "@/src/features/billing/payslip";
import type { SavedPayslip } from "@/src/features/billing/payslip-store";
import { formatInr } from "@/src/features/billing/utils";

type EditablePayslip = SavedPayslip;

function centsInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function centsFromInput(value: string) {
  const parsed = Number.parseFloat(value || "0");
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
}

function amountTotals(rows: PayslipAmountRow[]) {
  return rows.reduce((sum, row) => sum + row.amountInrCents, 0);
}

export function PayslipEditor({
  companyId,
  month,
  payslips,
  returnTo,
}: {
  companyId: string;
  month: string;
  payslips: SavedPayslip[];
  returnTo: string;
}) {
  const [selectedId, setSelectedId] = useState(payslips[0]?.id ?? "");
  const [editable, setEditable] = useState<EditablePayslip | undefined>(payslips[0]);
  const selectedPayslip = editable ?? payslips.find((payslip) => payslip.id === selectedId);
  const payslipJson = useMemo(() => JSON.stringify(selectedPayslip), [selectedPayslip]);
  const batchHref = `/api/payslips/batch?companyId=${encodeURIComponent(companyId)}&month=${encodeURIComponent(month)}`;

  function selectPayslip(payslip: SavedPayslip) {
    setSelectedId(payslip.id ?? "");
    setEditable(payslip);
  }

  function updatePayslip(patch: Partial<EditablePayslip>) {
    setEditable((current) => (current ? { ...current, ...patch } : current));
  }

  function updateAmountRow(section: "earnings" | "deductions" | "tdsIncomeTaxDeductions", index: number, patch: Partial<PayslipAmountRow>) {
    if (!selectedPayslip) return;
    updatePayslip({
      [section]: selectedPayslip[section].map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    });
  }

  function addAmountRow(section: "earnings" | "deductions" | "tdsIncomeTaxDeductions") {
    if (!selectedPayslip) return;
    updatePayslip({
      [section]: [
        ...selectedPayslip[section],
        { label: "NEW ROW", amountInrCents: 0, sortOrder: selectedPayslip[section].length + 1 },
      ],
    });
  }

  function removeAmountRow(section: "earnings" | "deductions" | "tdsIncomeTaxDeductions", index: number) {
    if (!selectedPayslip) return;
    updatePayslip({
      [section]: selectedPayslip[section].filter((_, rowIndex) => rowIndex !== index),
    });
  }

  function updateTdsEarning(index: number, patch: Partial<PayslipTdsEarningRow>) {
    if (!selectedPayslip) return;
    updatePayslip({
      tdsEarnings: selectedPayslip.tdsEarnings.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    });
  }

  function updateTaxPaid(index: number, patch: Partial<PayslipTaxPaidMonth>) {
    if (!selectedPayslip) return;
    updatePayslip({
      taxPaidMonths: selectedPayslip.taxPaidMonths.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    });
  }

  return (
    <div className="space-y-5">
      <div className="glass-panel flex flex-wrap items-center gap-3 p-5">
        <form action={preparePayslipsAction}>
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <PendingSubmitButton className="gradient-btn" defaultText="Prepare payslips" pendingText="Preparing..." />
        </form>
        {payslips.length > 0 ? (
          <a href={batchHref} className="btn-outline inline-flex items-center gap-2">
            <FileArchive className="h-4 w-4" />
            Download ZIP
          </a>
        ) : null}
      </div>

      {payslips.length === 0 ? (
        <div className="glass-panel p-6 text-sm" style={{ color: "var(--text-muted)" }}>
          Save the salary month first, then prepare payslips.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="glass-panel overflow-hidden">
            <div className="border-b px-4 py-3" style={{ borderColor: "var(--glass-border)" }}>
              <h2 className="text-lg font-semibold">Employee payslips</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{payslips.length} saved records</p>
            </div>
            <div className="max-h-[640px] overflow-y-auto p-2">
              {payslips.map((payslip) => (
                <button
                  key={payslip.id ?? payslip.employeeId}
                  type="button"
                  onClick={() => selectPayslip(payslip)}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm transition"
                  style={{
                    background: selectedPayslip?.employeeId === payslip.employeeId ? "rgba(99, 102, 241, 0.14)" : "transparent",
                    color: "var(--text-primary)",
                  }}
                >
                  <span className="block font-medium">{payslip.employeeName}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Net {formatInr(amountTotals(payslip.earnings) - amountTotals(payslip.deductions))}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedPayslip ? (
            <div className="glass-panel space-y-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{selectedPayslip.employeeName}</h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Net pay {formatInr(amountTotals(selectedPayslip.earnings) - amountTotals(selectedPayslip.deductions))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPayslip.id ? (
                    <a href={`/api/payslips/${encodeURIComponent(selectedPayslip.id)}/pdf`} className="btn-outline inline-flex items-center gap-2" target="_blank">
                      <Download className="h-4 w-4" />
                      PDF
                    </a>
                  ) : null}
                  <form action={preparePayslipsAction}>
                    <input type="hidden" name="companyId" value={companyId} />
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="resetEmployeeId" value={selectedPayslip.employeeId} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <PendingSubmitButton className="btn-outline inline-flex items-center gap-2" defaultText="Reset" pendingText="Resetting..." />
                  </form>
                  <form action={savePayslipAction}>
                    <input type="hidden" name="companyId" value={companyId} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="payslipJson" value={payslipJson} />
                    <PendingSubmitButton className="gradient-btn inline-flex items-center gap-2" defaultText="Save payslip" pendingText="Saving..." />
                  </form>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Employee name">
                  <input className={inputClass} value={selectedPayslip.employeeName} onChange={(event) => updatePayslip({ employeeName: event.currentTarget.value })} />
                </Field>
                <Field label="PAN number">
                  <input className={inputClass} value={selectedPayslip.panNumber} onChange={(event) => updatePayslip({ panNumber: event.currentTarget.value })} />
                </Field>
                <Field label="PF UAN">
                  <input className={inputClass} value={selectedPayslip.pfUan} onChange={(event) => updatePayslip({ pfUan: event.currentTarget.value })} />
                </Field>
                <Field label="Joining date">
                  <input type="date" className={inputClass} value={selectedPayslip.joiningDate} onChange={(event) => updatePayslip({ joiningDate: event.currentTarget.value })} />
                </Field>
                <Field label="Designation">
                  <input className={inputClass} value={selectedPayslip.designation} onChange={(event) => updatePayslip({ designation: event.currentTarget.value })} />
                </Field>
                <Field label="Effective work days">
                  <input type="number" min="0" className={inputClass} value={selectedPayslip.effectiveWorkDays} onChange={(event) => updatePayslip({ effectiveWorkDays: Number.parseInt(event.currentTarget.value || "0", 10) })} />
                </Field>
              </div>

              <AmountRows title="Earnings" rows={selectedPayslip.earnings} onAdd={() => addAmountRow("earnings")} onRemove={(index) => removeAmountRow("earnings", index)} onChange={(index, patch) => updateAmountRow("earnings", index, patch)} />
              <AmountRows title="Deductions" rows={selectedPayslip.deductions} onAdd={() => addAmountRow("deductions")} onRemove={(index) => removeAmountRow("deductions", index)} onChange={(index, patch) => updateAmountRow("deductions", index, patch)} />

              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--glass-border)" }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">TDS earnings</h3>
                </div>
                <div className="space-y-2">
                  {selectedPayslip.tdsEarnings.map((row, index) => (
                    <div key={`${row.label}:${index}`} className="grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
                      <input className={inputClass} value={row.label} onChange={(event) => updateTdsEarning(index, { label: event.currentTarget.value })} />
                      <input className={inputClass} type="number" value={centsInput(row.grossInrCents)} onChange={(event) => updateTdsEarning(index, { grossInrCents: centsFromInput(event.currentTarget.value) })} />
                      <input className={inputClass} type="number" value={centsInput(row.exemptInrCents)} onChange={(event) => updateTdsEarning(index, { exemptInrCents: centsFromInput(event.currentTarget.value) })} />
                      <input className={inputClass} type="number" value={centsInput(row.taxableInrCents)} onChange={(event) => updateTdsEarning(index, { taxableInrCents: centsFromInput(event.currentTarget.value) })} />
                    </div>
                  ))}
                </div>
              </div>

              <AmountRows title="Income tax deductions" rows={selectedPayslip.tdsIncomeTaxDeductions} onAdd={() => addAmountRow("tdsIncomeTaxDeductions")} onRemove={(index) => removeAmountRow("tdsIncomeTaxDeductions", index)} onChange={(index, patch) => updateAmountRow("tdsIncomeTaxDeductions", index, patch)} />

              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--glass-border)" }}>
                <h3 className="mb-3 font-semibold">Tax paid details</h3>
                <div className="grid gap-2 md:grid-cols-6">
                  {selectedPayslip.taxPaidMonths.map((row, index) => (
                    <Field key={row.monthCode} label={row.monthCode}>
                      <input className={inputClass} type="number" value={centsInput(row.amountInrCents)} onChange={(event) => updateTaxPaid(index, { amountInrCents: centsFromInput(event.currentTarget.value) })} />
                    </Field>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function AmountRows({
  title,
  rows,
  onAdd,
  onRemove,
  onChange,
}: {
  title: string;
  rows: PayslipAmountRow[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, patch: Partial<PayslipAmountRow>) => void;
}) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--glass-border)" }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <button type="button" className="btn-outline inline-flex items-center gap-2 px-3 py-2 text-xs" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add row
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={`${row.label}:${index}`} className="grid gap-2 md:grid-cols-[1fr_160px_44px]">
            <input className={inputClass} value={row.label} onChange={(event) => onChange(index, { label: event.currentTarget.value })} />
            <input className={inputClass} type="number" value={centsInput(row.amountInrCents)} onChange={(event) => onChange(index, { amountInrCents: centsFromInput(event.currentTarget.value) })} />
            <button type="button" className="btn-outline flex h-11 items-center justify-center" onClick={() => onRemove(index)} aria-label={`Remove ${row.label}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
