"use client";

import { useState } from "react";

import { inputClass } from "@/app/_components/field";

type AdjustmentFormAction = (formData: FormData) => void | Promise<void>;

function formatPreviewUsd(amount: number) {
  return amount.toFixed(2);
}

function calculatePreviewTotal(rateUsd: string, hours: string) {
  const rate = Number.parseFloat(rateUsd || "0");
  const billedHours = Number.parseFloat(hours || "0");

  if (Number.isNaN(rate) || Number.isNaN(billedHours)) {
    return 0;
  }

  return Math.round(rate * billedHours * 100) / 100;
}

function PersonAdjustmentCard({
  title,
  type,
  submitLabel,
  invoiceId,
  returnTo,
  action,
}: {
  title: string;
  type: "onboarding" | "offboarding" | "appraisal";
  submitLabel: string;
  invoiceId: string;
  returnTo: string;
  action: AdjustmentFormAction;
}) {
  const [rateUsd, setRateUsd] = useState("0");
  const [hours, setHours] = useState("0");
  const totalUsd = calculatePreviewTotal(rateUsd, hours);

  return (
    <form
      action={action}
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="type" value={type} />

      <div>
        <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h4>
      </div>

      <input name="employeeName" required placeholder="Name" className={inputClass} />

      <div className="grid gap-3 md:grid-cols-3">
        <input
          name="rateUsd"
          required
          type="number"
          step="0.01"
          min="0"
          placeholder="$/hr"
          className={inputClass}
          value={rateUsd}
          onChange={(event) => setRateUsd(event.target.value)}
        />
        <input
          name="hours"
          required
          type="number"
          step="0.01"
          min="0"
          placeholder="No. of hrs"
          className={inputClass}
          value={hours}
          onChange={(event) => setHours(event.target.value)}
        />
        <input
          value={formatPreviewUsd(totalUsd)}
          readOnly
          aria-label={`${title} total`}
          className={inputClass}
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      <button type="submit" className="gradient-btn w-full">
        {submitLabel}
      </button>
    </form>
  );
}

function ReimbursementCard({
  invoiceId,
  returnTo,
  action,
}: {
  invoiceId: string;
  returnTo: string;
  action: AdjustmentFormAction;
}) {
  return (
    <form
      action={action}
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="type" value="reimbursement" />

      <div>
        <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Reimbursements
        </h4>
      </div>

      <input
        name="label"
        required
        placeholder="Type / label"
        className={inputClass}
      />
      <input
        name="amountUsd"
        required
        type="number"
        step="0.01"
        min="0"
        placeholder="Amount"
        className={inputClass}
      />

      <button type="submit" className="gradient-btn w-full">
        Add reimbursement
      </button>
    </form>
  );
}

export function AdjustmentForms({
  invoiceId,
  returnTo,
  action,
}: {
  invoiceId: string;
  returnTo: string;
  action: AdjustmentFormAction;
}) {
  return (
    <div className="space-y-4">
      <PersonAdjustmentCard
        title="Onboarding advance"
        type="onboarding"
        submitLabel="Add onboarding advance"
        invoiceId={invoiceId}
        returnTo={returnTo}
        action={action}
      />
      <PersonAdjustmentCard
        title="Offboarding deduction"
        type="offboarding"
        submitLabel="Add offboarding deduction"
        invoiceId={invoiceId}
        returnTo={returnTo}
        action={action}
      />
      <ReimbursementCard
        invoiceId={invoiceId}
        returnTo={returnTo}
        action={action}
      />
      <PersonAdjustmentCard
        title="Appraisal advance"
        type="appraisal"
        submitLabel="Add appraisal advance"
        invoiceId={invoiceId}
        returnTo={returnTo}
        action={action}
      />
    </div>
  );
}
