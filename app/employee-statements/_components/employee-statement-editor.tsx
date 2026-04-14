"use client";

import { useState } from "react";

import { inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { saveEmployeeStatementAction } from "@/src/features/billing/actions";
import {
  buildEmployeeStatementDateRangeLabel,
  buildEmployeeStatementSavePayload,
  calculateStatementEffectiveDollarInwardUsdCents,
} from "@/src/features/billing/employee-statements";
import type {
  EmployeeStatementMonthSection,
  EmployeeStatementSection,
} from "@/src/features/billing/types";
import { centsFromUsd, formatUsd } from "@/src/features/billing/utils";

function formatUsdInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseUsdInput(value: string) {
  return centsFromUsd(value);
}

function buildDerivedMonths(months: EmployeeStatementMonthSection[]) {
  return months.map((month) => ({
    ...month,
    effectiveDollarInwardUsdCents: month.rows.reduce(
      (sum, row) =>
        sum +
        calculateStatementEffectiveDollarInwardUsdCents({
          dollarInwardUsdCents: row.dollarInwardUsdCents,
          onboardingAdvanceUsdCents: row.onboardingAdvanceUsdCents,
          reimbursementUsdCents: row.reimbursementUsdCents,
          offboardingDeductionUsdCents: row.offboardingDeductionUsdCents,
        }),
      0,
    ),
  }));
}

export default function EmployeeStatementEditor(props: {
  companyId: string;
  companyName: string;
  section: EmployeeStatementSection;
  startMonth: string;
  endMonth: string;
  generatedDate: string;
  returnTo: string;
}) {
  const [months, setMonths] = useState<EmployeeStatementMonthSection[]>(() =>
    props.section.months.map((month) => ({
      ...month,
      rows: month.rows.map((row) => ({ ...row })),
    })),
  );

  const derivedMonths = buildDerivedMonths(months);
  const payload = buildEmployeeStatementSavePayload({
    employeeId: props.section.employeeId,
    invoiceRows: derivedMonths.flatMap((month) => month.rows),
    monthSummaries: derivedMonths.map((month) => ({
      employeeId: props.section.employeeId,
      monthKey: month.monthKey,
      monthLabel: month.monthLabel,
      effectiveDollarInwardUsdCents: month.effectiveDollarInwardUsdCents,
      monthlyDollarPaidUsdCents: month.monthlyDollarPaidUsdCents,
    })),
  });
  const totals = derivedMonths.reduce(
    (accumulator, month) => {
      for (const row of month.rows) {
        accumulator.dollarInwardUsdCents += row.dollarInwardUsdCents;
        accumulator.onboardingAdvanceUsdCents += row.onboardingAdvanceUsdCents;
        accumulator.reimbursementUsdCents += row.reimbursementUsdCents;
        accumulator.offboardingDeductionUsdCents += row.offboardingDeductionUsdCents;
      }

      accumulator.effectiveDollarInwardUsdCents += month.effectiveDollarInwardUsdCents;
      accumulator.monthlyDollarPaidUsdCents += month.monthlyDollarPaidUsdCents;
      return accumulator;
    },
    {
      dollarInwardUsdCents: 0,
      onboardingAdvanceUsdCents: 0,
      reimbursementUsdCents: 0,
      offboardingDeductionUsdCents: 0,
      effectiveDollarInwardUsdCents: 0,
      monthlyDollarPaidUsdCents: 0,
    },
  );

  function updateRow(
    monthKey: string,
    invoiceId: string,
    field:
      | "dollarInwardUsdCents"
      | "onboardingAdvanceUsdCents"
      | "reimbursementUsdCents"
      | "offboardingDeductionUsdCents"
      | "reimbursementLabelsText",
    value: string,
  ) {
    setMonths((currentMonths) =>
      currentMonths.map((month) => {
        if (month.monthKey !== monthKey) {
          return month;
        }

        return {
          ...month,
          rows: month.rows.map((row) => {
            if (row.invoiceId !== invoiceId) {
              return row;
            }

            if (field === "reimbursementLabelsText") {
              return {
                ...row,
                reimbursementLabelsText: value,
              };
            }

            return {
              ...row,
              [field]: parseUsdInput(value),
            };
          }),
        };
      }),
    );
  }

  function updateMonthPaid(monthKey: string, value: string) {
    setMonths((currentMonths) =>
      currentMonths.map((month) =>
        month.monthKey === monthKey
          ? {
              ...month,
              monthlyDollarPaidUsdCents: parseUsdInput(value),
            }
          : month,
      ),
    );
  }

  const dateRangeLabel = buildEmployeeStatementDateRangeLabel({
    startMonth: props.startMonth,
    endMonth: props.endMonth,
  });
  const downloadHref = `/api/employee-statements/${encodeURIComponent(
    props.section.employeeId,
  )}/pdf?companyId=${encodeURIComponent(props.companyId)}&startMonth=${encodeURIComponent(
    props.startMonth,
  )}&endMonth=${encodeURIComponent(props.endMonth)}`;

  return (
    <form action={saveEmployeeStatementAction} className="space-y-6">
      <input type="hidden" name="returnTo" value={props.returnTo} />
      <input type="hidden" name="statementJson" value={JSON.stringify(payload)} />

      <div
        className="grid gap-4 rounded-3xl border p-5 lg:grid-cols-[1.4fr_1fr]"
        style={{
          borderColor: "var(--glass-border)",
          background: "rgba(255, 255, 255, 0.03)",
        }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] gradient-text">
            Employee Statement
          </p>
          <h3 className="mt-2 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {props.section.employeeName}
          </h3>
          <div className="mt-4 grid gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Company:
              </span>{" "}
              {props.companyName}
            </p>
            <p>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Employee:
              </span>{" "}
              {props.section.employeeName}
            </p>
            <p>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Selected range:
              </span>{" "}
              {dateRangeLabel}
            </p>
            <p>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Generated date:
              </span>{" "}
              {props.generatedDate}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-end gap-3">
          <a href={downloadHref} className="btn-outline">
            Download PDF
          </a>
          <PendingSubmitButton
            className="gradient-btn"
            defaultText="Save"
            pendingText="Saving..."
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border" style={{ borderColor: "var(--glass-border)" }}>
        <table className="min-w-full text-sm">
          <thead>
            <tr
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text-secondary)",
              }}
            >
              <th className="px-4 py-3 text-left font-medium">Month</th>
              <th className="px-4 py-3 text-left font-medium">Invoice no.</th>
              <th className="px-4 py-3 text-right font-medium">Dollar inward</th>
              <th className="px-4 py-3 text-right font-medium">Onboarding advance</th>
              <th className="px-4 py-3 text-right font-medium">
                Employee reimbursements (USD)
              </th>
              <th className="px-4 py-3 text-left font-medium">
                Employee reimbursement labels
              </th>
              <th className="px-4 py-3 text-right font-medium">Offboarding deduction</th>
            </tr>
          </thead>
          <tbody>
            {derivedMonths.map((month) => (
              <FragmentRows
                key={month.monthKey}
                month={month}
                onRowChange={updateRow}
                onMonthPaidChange={updateMonthPaid}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="grid gap-3 rounded-3xl border p-5 md:grid-cols-3"
        style={{
          borderColor: "var(--glass-border)",
          background: "rgba(255, 255, 255, 0.03)",
        }}
      >
        <MetricCard label="Dollar inward" value={formatUsd(totals.dollarInwardUsdCents)} />
        <MetricCard
          label="Onboarding advance"
          value={formatUsd(totals.onboardingAdvanceUsdCents)}
        />
        <MetricCard
          label="Employee reimbursements (USD)"
          value={formatUsd(totals.reimbursementUsdCents)}
        />
        <MetricCard
          label="Offboarding deduction"
          value={formatUsd(totals.offboardingDeductionUsdCents)}
        />
        <MetricCard
          label="Effective dollar inward"
          value={formatUsd(totals.effectiveDollarInwardUsdCents)}
        />
        <MetricCard
          label="Monthly $ paid"
          value={formatUsd(totals.monthlyDollarPaidUsdCents)}
        />
      </div>
    </form>
  );
}

function FragmentRows(props: {
  month: EmployeeStatementMonthSection;
  onRowChange: (
    monthKey: string,
    invoiceId: string,
    field:
      | "dollarInwardUsdCents"
      | "onboardingAdvanceUsdCents"
      | "reimbursementUsdCents"
      | "offboardingDeductionUsdCents"
      | "reimbursementLabelsText",
    value: string,
  ) => void;
  onMonthPaidChange: (monthKey: string, value: string) => void;
}) {
  return (
    <>
      {props.month.rows.map((row) => (
        <tr
          key={row.invoiceId}
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}
        >
          <td className="px-4 py-3 align-top" style={{ color: "var(--text-secondary)" }}>
            {row.monthLabel}
          </td>
          <td className="px-4 py-3 align-top" style={{ color: "var(--text-primary)" }}>
            {row.invoiceNumber}
          </td>
          <td className="px-4 py-3 align-top">
            <input
              type="number"
              step="0.01"
              value={formatUsdInput(row.dollarInwardUsdCents)}
              onChange={(event) =>
                props.onRowChange(
                  props.month.monthKey,
                  row.invoiceId,
                  "dollarInwardUsdCents",
                  event.target.value,
                )
              }
              className={`${inputClass} text-right`}
            />
          </td>
          <td className="px-4 py-3 align-top">
            <input
              type="number"
              step="0.01"
              value={formatUsdInput(row.onboardingAdvanceUsdCents)}
              onChange={(event) =>
                props.onRowChange(
                  props.month.monthKey,
                  row.invoiceId,
                  "onboardingAdvanceUsdCents",
                  event.target.value,
                )
              }
              className={`${inputClass} text-right`}
            />
          </td>
          <td className="px-4 py-3 align-top">
            <input
              type="number"
              step="0.01"
              value={formatUsdInput(row.reimbursementUsdCents)}
              onChange={(event) =>
                props.onRowChange(
                  props.month.monthKey,
                  row.invoiceId,
                  "reimbursementUsdCents",
                  event.target.value,
                )
              }
              className={`${inputClass} text-right`}
            />
          </td>
          <td className="px-4 py-3 align-top">
            <input
              type="text"
              value={row.reimbursementLabelsText}
              onChange={(event) =>
                props.onRowChange(
                  props.month.monthKey,
                  row.invoiceId,
                  "reimbursementLabelsText",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </td>
          <td className="px-4 py-3 align-top">
            <input
              type="number"
              step="0.01"
              value={formatUsdInput(row.offboardingDeductionUsdCents)}
              onChange={(event) =>
                props.onRowChange(
                  props.month.monthKey,
                  row.invoiceId,
                  "offboardingDeductionUsdCents",
                  event.target.value,
                )
              }
              className={`${inputClass} text-right`}
            />
          </td>
        </tr>
      ))}

      <tr style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <td
          colSpan={6}
          className="px-4 py-3 text-sm font-semibold"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            color: "var(--text-primary)",
          }}
        >
          Effective dollar inward
        </td>
        <td
          className="px-4 py-3 text-right text-sm font-semibold"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            color: "var(--text-primary)",
          }}
        >
          {formatUsd(props.month.effectiveDollarInwardUsdCents)}
        </td>
      </tr>

      <tr style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <td
          colSpan={6}
          className="px-4 py-3 text-sm font-semibold"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            color: "var(--text-primary)",
          }}
        >
          Monthly $ paid
        </td>
        <td
          className="px-4 py-3"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
          }}
        >
          <input
            type="number"
            step="0.01"
            value={formatUsdInput(props.month.monthlyDollarPaidUsdCents)}
            onChange={(event) =>
              props.onMonthPaidChange(props.month.monthKey, event.target.value)
            }
            className={`${inputClass} text-right`}
          />
        </td>
      </tr>
    </>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        borderColor: "rgba(255, 255, 255, 0.08)",
        background: "rgba(255, 255, 255, 0.02)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        {props.label}
      </p>
      <p className="mt-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        {props.value}
      </p>
    </div>
  );
}
