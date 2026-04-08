"use client";

import { useMemo, useState } from "react";

import { Field, inputClass } from "@/app/_components/field";
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
  name: string;
  rateUsd: string;
  hours: string;
  label: string;
  amountUsd: string;
};

const INITIAL_FORM: FormState = {
  type: "",
  name: "",
  rateUsd: "",
  hours: "",
  label: "",
  amountUsd: "",
};

function formatHours(hours: number | undefined) {
  if (hours === undefined) {
    return "";
  }

  return Number.isInteger(hours) ? String(hours) : String(hours);
}

function buildClientAdjustmentPayload(form: FormState) {
  if (!form.type) {
    throw new Error("Select an adjustment type.");
  }

  if (form.type === "reimbursement") {
    return buildInvoiceAdjustmentPayload({
      type: "reimbursement",
      label: form.label,
      amountUsdCents: centsFromUsd(form.amountUsd),
    });
  }

  return buildInvoiceAdjustmentPayload({
    type: form.type,
    employeeName: form.name,
    rateUsdCents: centsFromUsd(form.rateUsd),
    hours: Number.parseFloat(form.hours || "0"),
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
    adjustment.hours !== undefined ? `${formatHours(adjustment.hours)} hrs` : undefined,
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
}: {
  title: string;
  items: InvoiceAdjustment[];
  totalUsdCents: number;
  invoiceId: string;
  returnTo: string;
  deleteAction: AdjustmentFormAction;
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
              <p
                className="font-semibold"
                style={{
                  color:
                    adjustment.type === "offboarding" ? "#fca5a5" : "var(--text-primary)",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                }}
              >
                {adjustment.type === "offboarding"
                  ? `-${formatUsd(Math.abs(adjustment.amountUsdCents))}`
                  : formatUsd(adjustment.amountUsdCents)}
              </p>
              <form action={deleteAction}>
                <input type="hidden" name="invoiceId" value={invoiceId} />
                <input type="hidden" name="adjustmentId" value={adjustment.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button type="submit" className="btn-outline">
                  Remove
                </button>
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
  adjustments,
  addAction,
  deleteAction,
}: {
  invoiceId: string;
  returnTo: string;
  adjustments: InvoiceAdjustment[];
  addAction: AdjustmentFormAction;
  deleteAction: AdjustmentFormAction;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const grouped = useMemo(() => groupInvoiceAdjustments(adjustments), [adjustments]);

  const totalPreview =
    form.type && form.type !== "reimbursement"
      ? formatUsd(
          calculatePersonAdjustmentTotalUsdCents({
            rateUsdCents: centsFromUsd(form.rateUsd),
            hours: Number.parseFloat(form.hours || "0"),
          }),
        )
      : "";

  const handleTypeChange = (type: AdjustmentTypeOption) => {
    setError("");
    setForm({
      ...INITIAL_FORM,
      type,
    });
  };

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
            Select one adjustment type and enter the matching details below.
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
                step="0.01"
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
            <Field label="Name">
              <input
                name="employeeName"
                placeholder="Enter employee name"
                className={`${inputClass} min-h-14`}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
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
                  setForm((current) => ({ ...current, rateUsd: event.target.value }))
                }
              />
            </Field>
            <Field label="Hours">
              <input
                name="hours"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter number of hours"
                className={`${inputClass} min-h-14`}
                value={form.hours}
                onChange={(event) =>
                  setForm((current) => ({ ...current, hours: event.target.value }))
                }
              />
            </Field>
            <Field label="Total">
              <input
                readOnly
                value={totalPreview}
                aria-label="Total"
                className={`${inputClass} min-h-14`}
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
      />
      <AdjustmentGroup
        title="Appraisal Advance"
        items={grouped.appraisal.items}
        totalUsdCents={grouped.appraisal.totalUsdCents}
        invoiceId={invoiceId}
        returnTo={returnTo}
        deleteAction={deleteAction}
      />
      <AdjustmentGroup
        title="Reimbursements / Expenses"
        items={grouped.reimbursement.items}
        totalUsdCents={grouped.reimbursement.totalUsdCents}
        invoiceId={invoiceId}
        returnTo={returnTo}
        deleteAction={deleteAction}
      />
      <AdjustmentGroup
        title="Offboarding Deductions"
        items={grouped.offboarding.items}
        totalUsdCents={grouped.offboarding.totalUsdCents}
        invoiceId={invoiceId}
        returnTo={returnTo}
        deleteAction={deleteAction}
      />
    </div>
  );
}
