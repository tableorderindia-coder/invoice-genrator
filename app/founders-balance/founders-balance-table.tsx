"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import {
  FOUNDER_BALANCE_FOUNDERS,
  type FounderBalanceModel,
} from "../../src/features/billing/founders-balance";
import { formatInr, formatMonthYear, formatSignedInr } from "../../src/features/billing/utils";

type FoundersBalanceTableProps = {
  companyId: string;
  data: FounderBalanceModel;
  returnTo: string;
  saveFounderWithdrawalsAction: (formData: FormData) => Promise<void>;
};

function amountColor(cents: number) {
  if (cents < 0) return "#fca5a5";
  if (cents > 0) return "#6ee7b7";
  return "var(--text-primary)";
}

function formatInputAmount(cents: number) {
  return (cents / 100).toFixed(2);
}

function FounderWithdrawalInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: number;
}) {
  const { pending } = useFormStatus();
  return (
    <input
      type="number"
      name={name}
      min="0"
      step="0.01"
      defaultValue={formatInputAmount(defaultValue)}
      disabled={pending}
      className={inputClass}
      style={{
        minWidth: "8rem",
        border: "1px solid var(--glass-border)",
        background: "rgba(255,255,255,0.04)",
        color: "var(--text-primary)",
        opacity: pending ? 0.6 : 1,
      }}
    />
  );
}

function PendingCheckbox({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  const { pending } = useFormStatus();
  const checkbox = (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled || pending}
      onChange={(event) => onChange(event.target.checked)}
      style={{ accentColor: "var(--accent-1)", width: 14, height: 14 }}
    />
  );
  if (!label) return checkbox;
  return (
    <label className="flex items-center gap-2">
      {checkbox}
      {label}
    </label>
  );
}

export function FoundersBalanceTable({
  companyId,
  data,
  returnTo,
  saveFounderWithdrawalsAction,
}: FoundersBalanceTableProps) {
  const rowKeys = useMemo(() => data.rows.map((row) => row.key), [data.rows]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set(rowKeys));

  const allSelected = rowKeys.length > 0 && selectedRows.size === rowKeys.length;
  const toggleAll = (checked: boolean) => {
    setSelectedRows(checked ? new Set(rowKeys) : new Set());
  };
  const toggleRow = (rowKey: string, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(rowKey);
      } else {
        next.delete(rowKey);
      }
      return next;
    });
  };

  return (
    <form action={saveFounderWithdrawalsAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Founder’s Share is split equally across Nirbhay, Pawan, and Vishal.
        </p>
        <PendingSubmitButton
          className="gradient-btn"
          defaultText="Update selected"
          pendingText="Updating..."
          disabled={selectedRows.size === 0 || data.rows.length === 0}
        />
      </div>
      <div
        className="overflow-x-auto rounded-2xl"
        style={{ border: "1px solid var(--glass-border)" }}
      >
        <table className="glass-table min-w-max">
          <thead>
            <tr>
              <th>
                <PendingCheckbox
                  checked={allSelected}
                  disabled={rowKeys.length === 0}
                  onChange={toggleAll}
                  label="Select all"
                />
              </th>
              <th>P&L Month</th>
              <th>Company Net P/L</th>
              <th>Each Founder Share</th>
              {FOUNDER_BALANCE_FOUNDERS.map((founder) => (
                <th key={founder.key}>{founder.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const checked = selectedRows.has(row.key);
              return (
                <tr key={row.key}>
                  <td>
                    <input type="hidden" name="rowKey" value={row.key} />
                    {checked ? (
                      <input type="hidden" name="selectedRow" value={row.key} />
                    ) : null}
                    <PendingCheckbox
                      checked={checked}
                      onChange={(nextChecked) => toggleRow(row.key, nextChecked)}
                    />
                  </td>
                  <td>{formatMonthYear(row.month, row.year)}</td>
                  <td style={{ color: amountColor(row.netPlInrCents), fontWeight: 600 }}>
                    {formatSignedInr(row.netPlInrCents)}
                  </td>
                  <td style={{ color: amountColor(row.founderEntitlementInrCents) }}>
                    {formatSignedInr(row.founderEntitlementInrCents)}
                  </td>
                  {FOUNDER_BALANCE_FOUNDERS.map((founder) => (
                    <td key={founder.key}>
                      <FounderWithdrawalInput
                        name={`withdrawal__${row.key}__${founder.key}`}
                        defaultValue={row.withdrawals[founder.key]}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
            {data.rows.length > 0 ? (
              <>
                <tr>
                  <td />
                  <td className="font-semibold">Totals</td>
                  <td
                    className="font-semibold"
                    style={{ color: amountColor(data.totals.netPlInrCents) }}
                  >
                    {formatSignedInr(data.totals.netPlInrCents)}
                  </td>
                  <td
                    className="font-semibold"
                    style={{ color: amountColor(data.totals.founderEntitlementInrCents) }}
                  >
                    {formatSignedInr(data.totals.founderEntitlementInrCents)}
                  </td>
                  {FOUNDER_BALANCE_FOUNDERS.map((founder) => (
                    <td key={founder.key} className="font-semibold">
                      {formatInr(data.totals.withdrawals[founder.key])}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td />
                  <td className="font-semibold">Available for withdrawal</td>
                  <td />
                  <td />
                  {FOUNDER_BALANCE_FOUNDERS.map((founder) => (
                    <td
                      key={founder.key}
                      className="font-semibold"
                      style={{ color: amountColor(data.available[founder.key]) }}
                    >
                      {formatSignedInr(data.available[founder.key])}
                    </td>
                  ))}
                </tr>
              </>
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center"
                  style={{ color: "var(--text-muted)" }}
                >
                  No founder balance rows available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </form>
  );
}
