"use client";

import { useMemo, useState } from "react";

import { Field, inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import {
  buildAdjustmentDuplicateSignature,
  buildInvoiceAdjustmentPayload,
  calculatePersonAdjustmentTotalUsdCents,
  groupInvoiceAdjustments,
} from "@/src/features/billing/adjustments";
import type { InvoiceAdjustment } from "@/src/features/billing/types";
import { centsFromUsd, formatUsd } from "@/src/features/billing/utils";

type AdjustmentFormAction = (formData: FormData) => void | Promise<void>;

type AdjustmentTypeOption =
  | ""
  | "onboarding"
  | "appraisal"
  | "reimbursement"
  | "offboarding";

type FormState = {
  type: AdjustmentTypeOption;
  employeeName: string;
  rateUsd: string;
  hrsPerWeek: string;
  label: string;
  amountUsd: string;
};

const INITIAL_FORM: FormState = {
  type: "",
  employeeName: "",
  rateUsd: "",
  hrsPerWeek: "",
  label: "",
  amountUsd: "",
};

function wholeUsdCentsFromInput(input: string) {
  const normalized = Number.parseFloat(input || "0");
  if (Number.isNaN(normalized)) {
    return 0;
  }

  return Math.round(normalized) * 100;
}

function personTotalUsdInputValue(rateUsd: string, hrsPerWeek: string) {
  const cents = calculatePersonAdjustmentTotalUsdCents({
    rateUsdCents: centsFromUsd(rateUsd),
    hrsPerWeek: Number.parseFloat(hrsPerWeek || "0"),
  });
  return String(Math.round(cents / 100));
}

function formatHours(hoursPerWeek: number | undefined) {
  if (hoursPerWeek === undefined) {
    return "";
  }

  return Number.isInteger(hoursPerWeek) ? String(hoursPerWeek) : String(hoursPerWeek);
}

function buildClientAdjustmentPayload(form: FormState) {
  if (!form.type) {
    throw new Error("Select an adjustment type.");
  }

  if (form.type === "reimbursement") {
    return buildInvoiceAdjustmentPayload({
      type: "reimbursement",
      label: form.label,
      amountUsdCents: wholeUsdCentsFromInput(form.amountUsd),
    });
  }

  return buildInvoiceAdjustmentPayload({
    type: form.type,
    employeeName: form.employeeName,
    rateUsdCents: centsFromUsd(form.rateUsd),
    hrsPerWeek: Number.parseFloat(form.hrsPerWeek || "0"),
    amountUsdCents: wholeUsdCentsFromInput(form.amountUsd),
  });
}

function getTypeLabel(type: Exclude<AdjustmentTypeOption, "">) {
  switch (type) {
    case "onboarding":
      return "Onboarding Advance";
    case "appraisal":
      return "Appraisal Advance";
    case "reimbursement":
      return "Reimbursements / Expenses";
    case "offboarding":
      return "Offboarding Deductions";
  }
}

function describeAdjustment(adjustment: InvoiceAdjustment) {
  if (adjustment.type === "reimbursement") {
    return adjustment.label;
  }

  return [
    adjustment.employeeName,
    adjustment.rateUsdCents !== undefined
      ? `${formatUsd(adjustment.rateUsdCents)}/hr`
      : undefined,
    adjustment.hrsPerWeek !== undefined ? `${formatHours(adjustment.hrsPerWeek)} hrs/week` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

function AdjustmentGroup({
  title,
  items,
  totalUsdCents,
  invoiceId,
  returnTo,
  deleteAction,
  updateAmountAction,
}: {
  title: string;
  items: InvoiceAdjustment[];
  totalUsdCents: number;
  invoiceId: string;
  returnTo: string;
  deleteAction: AdjustmentFormAction;
  updateAmountAction: AdjustmentFormAction;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h4>
        <p
          className="text-sm font-semibold"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          {formatUsd(totalUsdCents)}
        </p>
      </div>

      <div className="mt-3 space-y-3">
        {items.map((adjustment) => (
          <div
            key={adjustment.id}
            className="flex items-center justify-between gap-4 rounded-2xl p-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                {getTypeLabel(adjustment.type)}
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {describeAdjustment(adjustment)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <form action={updateAmountAction} className="flex items-center gap-2">
                <input type="hidden" name="invoiceId" value={invoiceId} />
                <input type="hidden" name="adjustmentId" value={adjustment.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input
                  name="amountUsd"
                  type="number"
                  step="1"
                  className={inputClass}
                  defaultValue={Math.round(adjustment.amountUsdCents / 100)}
                  style={{ minWidth: "8rem" }}
                />
                <PendingSubmitButton
                  className="btn-outline"
                  defaultText="Update amount"
                  pendingText="Updating..."
                />
              </form>
              <form action={deleteAction}>
                <input type="hidden" name="invoiceId" value={invoiceId} />
                <input type="hidden" name="adjustmentId" value={adjustment.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <PendingSubmitButton
                  className="btn-outline"
                  defaultText="Remove"
                  pendingText="Removing..."
                />
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdjustmentForms({
  invoiceId,
  returnTo,
  employees,
  securityDepositBalances,
  adjustments,
  addAction,
  deleteAction,
  updateAmountAction,
}: {
  invoiceId: string;
  returnTo: string;
  employees: Array<{ id: string; fullName: string }>;
  securityDepositBalances: Record<string, number>;
  adjustments: InvoiceAdjustment[];
  addAction: AdjustmentFormAction;
  deleteAction: AdjustmentFormAction;
  updateAmountAction: AdjustmentFormAction;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const grouped = useMemo(() => groupInvoiceAdjustments(adjustments), [adjustments]);

  const handleTypeChange = (type: AdjustmentTypeOption) => {
    setError("");
    const defaultEmployeeName =
      type === "reimbursement" || !type ? "" : employees[0]?.fullName ?? "";
    setForm({
      ...INITIAL_FORM,
      type,
      employeeName: defaultEmployeeName,
      amountUsd:
        type === "reimbursement" || !type
          ? ""
          : personTotalUsdInputValue(INITIAL_FORM.rateUsd, INITIAL_FORM.hrsPerWeek),
    });
  };

  const selectedEmployeeDepositBalanceUsdCents =
    form.employeeName && (form.type === "onboarding" || form.type === "offboarding")
      ? securityDepositBalances[form.employeeName] ?? 0
      : 0;

  return (
    <div className="space-y-4">
      <form
        action={addAction}
        className="rounded-3xl p-6 space-y-5"
        onSubmit={(event) => {
          if (isAdding) {
            event.preventDefault();
            return;
          }

          try {
            const candidate = buildClientAdjustmentPayload(form);
            const signature = buildAdjustmentDuplicateSignature(candidate);
            const exists = adjustments.some(
              (adjustment) =>
                buildAdjustmentDuplicateSignature(adjustment) === signature,
            );

            if (exists) {
              event.preventDefault();
              setError("Duplicate adjustment already added.");
              return;
            }

            setIsAdding(true);
            setError("");
          } catch (submissionError) {
            event.preventDefault();
            setError(
              submissionError instanceof Error
                ? submissionError.message
                : "Unable to add adjustment.",
            );
          }
        }}
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <input type="hidden" name="returnTo" value={returnTo} />

        <div>
          <h4 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Add adjustment
          </h4>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Onboarding advance is treated as security deposit paid by the client.
          </p>
        </div>

        <Field label="Adjustment type">
          <select
            name="type"
            className={`${inputClass} min-h-14`}
            value={form.type}
            onChange={(event) => handleTypeChange(event.target.value as AdjustmentTypeOption)}
          >
            <option value="">Select adjustment type</option>
            <option value="onboarding">Onboarding Advance</option>
            <option value="appraisal">Appraisal Advance</option>
            <option value="reimbursement">Reimbursements / Expenses</option>
            <option value="offboarding">Offboarding Deductions</option>
          </select>
        </Field>

        {form.type === "reimbursement" ? (
          <div className="space-y-4">
            <Field label="Type / Label">
              <input
                name="label"
                placeholder="Enter expense type (e.g., travel, food)"
                className={`${inputClass} min-h-14`}
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
              />
            </Field>
            <Field label="Amount">
              <input
                name="amountUsd"
                type="number"
                step="1"
                min="0"
                placeholder="Enter amount"
                className={`${inputClass} min-h-14`}
                value={form.amountUsd}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amountUsd: event.target.value }))
                }
              />
            </Field>
          </div>
        ) : form.type ? (
          <div className="space-y-4">
            <Field label="Employee">
              <select
                name="employeeName"
                className={`${inputClass} min-h-14`}
                value={form.employeeName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    employeeName: event.target.value,
                  }))
                }
              >
                {employees.length === 0 ? (
                  <option value="">No employees available</option>
                ) : (
                  employees.map((employee) => (
                    <option key={employee.id} value={employee.fullName}>
                      {employee.fullName}
                    </option>
                  ))
                )}
              </select>
            </Field>
            {(form.type === "onboarding" || form.type === "offboarding") &&
            form.employeeName ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Current security deposit balance:{" "}
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                  }}
                >
                  {formatUsd(selectedEmployeeDepositBalanceUsdCents)}
                </span>
              </p>
            ) : null}
            <Field label="Rate ($/hr)">
              <input
                name="rateUsd"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter hourly rate"
                className={`${inputClass} min-h-14`}
                value={form.rateUsd}
                onChange={(event) =>
                  setForm((current) => {
                    const nextRateUsd = event.target.value;
                    return {
                      ...current,
                      rateUsd: nextRateUsd,
                      amountUsd: personTotalUsdInputValue(nextRateUsd, current.hrsPerWeek),
                    };
                  })
                }
              />
            </Field>
            <Field label="Hrs per week">
              <input
                name="hrsPerWeek"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter hrs per week"
                className={`${inputClass} min-h-14`}
                value={form.hrsPerWeek}
                onChange={(event) =>
                  setForm((current) => {
                    const nextHours = event.target.value;
                    return {
                      ...current,
                      hrsPerWeek: nextHours,
                      amountUsd: personTotalUsdInputValue(current.rateUsd, nextHours),
                    };
                  })
                }
              />
            </Field>
            <Field label="Total">
              <input
                name="amountUsd"
                type="number"
                step="1"
                min="0"
                value={form.amountUsd}
                aria-label="Total"
                className={`${inputClass} min-h-14`}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amountUsd: event.target.value }))
                }
              />
            </Field>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm font-medium" style={{ color: "#fca5a5" }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="gradient-btn"
          disabled={isAdding}
          style={isAdding ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
        >
          {isAdding ? "Adding..." : "Add / Update"}
        </button>
      </form>

      <AdjustmentGroup
        title="Onboarding Advance"
        items={grouped.onboarding.items}
        totalUsdCents={grouped.onboarding.totalUsdCents}
        invoiceId={invoiceId}
        returnTo={returnTo}
        deleteAction={deleteAction}
        updateAmountAction={updateAmountAction}
      />
      <AdjustmentGroup
        title="Appraisal Advance"
        items={grouped.appraisal.items}
        totalUsdCents={grouped.appraisal.totalUsdCents}
        invoiceId={invoiceId}
        returnTo={returnTo}
        deleteAction={deleteAction}
        updateAmountAction={updateAmountAction}
      />
      <AdjustmentGroup
        title="Reimbursements / Expenses"
        items={grouped.reimbursement.items}
        totalUsdCents={grouped.reimbursement.totalUsdCents}
        invoiceId={invoiceId}
        returnTo={returnTo}
        deleteAction={deleteAction}
        updateAmountAction={updateAmountAction}
      />
      <AdjustmentGroup
        title="Offboarding Deductions"
        items={grouped.offboarding.items}
        totalUsdCents={grouped.offboarding.totalUsdCents}
        invoiceId={invoiceId}
        returnTo={returnTo}
        deleteAction={deleteAction}
        updateAmountAction={updateAmountAction}
      />
    </div>
  );
}
