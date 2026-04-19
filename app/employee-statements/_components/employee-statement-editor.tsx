"use client";

import { useState } from "react";

import { inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { saveEmployeeStatementAction } from "@/src/features/billing/actions";
import {
  buildEmployeeStatementDateRangeLabel,
  buildEmployeeStatementTotals,
  buildFlattenedEmployeeStatementRows,
  buildEmployeeStatementSavePayload,
  calculateStatementEffectiveDollarInwardUsdCents,
} from "@/src/features/billing/employee-statements";
import type { EmployeeStatementSection } from "@/src/features/billing/types";
import { centsFromUsd, formatUsd } from "@/src/features/billing/utils";

function formatUsdInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseUsdInput(value: string) {
  return centsFromUsd(value);
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
  const [months, setMonths] = useState<EmployeeStatementSection["months"]>(() =>
    props.section.months.map((month) => ({
      ...month,
      rows: month.rows.map((row) => ({ ...row })),
    })),
  );

  const derivedSection: EmployeeStatementSection = {
    ...props.section,
    months: months.map((month) => ({
      ...month,
      effectiveDollarInwardUsdCents: month.rows.reduce(
        (sum, row) =>
          sum +
          calculateStatementEffectiveDollarInwardUsdCents({
            dollarInwardUsdCents: row.dollarInwardUsdCents,
            onboardingAdvanceUsdCents: row.onboardingAdvanceUsdCents,
            reimbursementUsdCents: row.reimbursementUsdCents,
            appraisalAdvanceUsdCents: row.appraisalAdvanceUsdCents,
            offboardingDeductionUsdCents: row.offboardingDeductionUsdCents,
          }),
        0,
      ),
    })),
  };
  const flattenedRows = buildFlattenedEmployeeStatementRows(derivedSection);
  const payload = buildEmployeeStatementSavePayload({
    employeeId: props.section.employeeId,
    invoiceRows: derivedSection.months.flatMap((month) => month.rows),
    monthSummaries: derivedSection.months.map((month) => ({
      employeeId: props.section.employeeId,
      monthKey: month.monthKey,
      monthLabel: month.monthLabel,
      effectiveDollarInwardUsdCents: month.effectiveDollarInwardUsdCents,
      monthlyDollarPaidUsdCents: month.monthlyDollarPaidUsdCents,
    })),
  });
  const totals = buildEmployeeStatementTotals(derivedSection);

  function updateRow(
    monthKey: string,
    invoiceId: string,
    field:
      | "dollarInwardUsdCents"
      | "onboardingAdvanceUsdCents"
      | "reimbursementUsdCents"
      | "appraisalAdvanceUsdCents"
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
        <table className="min-w-[1500px] text-sm">
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
              <th className="px-4 py-3 text-right font-medium">Appraisal advance</th>
              <th className="px-4 py-3 text-right font-medium">Offboarding deduction</th>
              <th className="px-4 py-3 text-right font-medium">Effective dollar inward</th>
              <th className="px-4 py-3 text-right font-medium">Monthly $ paid</th>
              <th className="px-4 py-3 text-right font-medium">Total balance</th>
            </tr>
          </thead>
          <tbody>
            {flattenedRows.map((row) =>
              row.kind === "spacer" ? (
                <tr key={`spacer-${row.monthKey}`} aria-hidden="true">
                  <td colSpan={10} className="h-4" />
                </tr>
              ) : (
                <tr
                  key={row.invoiceId}
                  style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}
                >
                  <td className="px-4 py-3 align-top whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {row.monthLabel}
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                    {row.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      step="0.01"
                      value={formatUsdInput(row.dollarInwardUsdCents)}
                      onChange={(event) =>
                        updateRow(
                          row.monthKey,
                          row.invoiceId,
                          "dollarInwardUsdCents",
                          event.target.value,
                        )
                      }
                      className={`${inputClass} min-w-[8rem] text-right`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      step="0.01"
                      value={formatUsdInput(row.onboardingAdvanceUsdCents)}
                      onChange={(event) =>
                        updateRow(
                          row.monthKey,
                          row.invoiceId,
                          "onboardingAdvanceUsdCents",
                          event.target.value,
                        )
                      }
                      className={`${inputClass} min-w-[8rem] text-right`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-2">
                      <input
                        type="number"
                        step="0.01"
                        value={formatUsdInput(row.reimbursementUsdCents)}
                        onChange={(event) =>
                          updateRow(
                            row.monthKey,
                            row.invoiceId,
                            "reimbursementUsdCents",
                            event.target.value,
                          )
                        }
                        className={`${inputClass} min-w-[8rem] text-right`}
                      />
                      <input
                        type="text"
                        value={row.reimbursementLabelsText}
                        placeholder="Labels"
                        onChange={(event) =>
                          updateRow(
                            row.monthKey,
                            row.invoiceId,
                            "reimbursementLabelsText",
                            event.target.value,
                          )
                        }
                        className={`${inputClass} min-w-[14rem]`}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      step="0.01"
                      value={formatUsdInput(row.appraisalAdvanceUsdCents)}
                      onChange={(event) =>
                        updateRow(
                          row.monthKey,
                          row.invoiceId,
                          "appraisalAdvanceUsdCents",
                          event.target.value,
                        )
                      }
                      className={`${inputClass} min-w-[8rem] text-right`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      step="0.01"
                      value={formatUsdInput(row.offboardingDeductionUsdCents)}
                      onChange={(event) =>
                        updateRow(
                          row.monthKey,
                          row.invoiceId,
                          "offboardingDeductionUsdCents",
                          event.target.value,
                        )
                      }
                      className={`${inputClass} min-w-[8rem] text-right`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                    {row.effectiveDollarInwardUsdCents === null
                      ? ""
                      : formatUsd(row.effectiveDollarInwardUsdCents)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {row.monthlyDollarPaidUsdCents === null ? null : (
                      <input
                        type="number"
                        step="0.01"
                        value={formatUsdInput(row.monthlyDollarPaidUsdCents)}
                        onChange={(event) => updateMonthPaid(row.monthKey, event.target.value)}
                        className={`${inputClass} min-w-[8rem] text-right`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                    {row.totalBalanceUsdCents === null ? "" : formatUsd(row.totalBalanceUsdCents)}
                  </td>
                </tr>
              ),
            )}
          </tbody>
          <tfoot>
            <tr
              style={{
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                Totals
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatUsd(totals.dollarInwardUsdCents)}
              </td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatUsd(totals.onboardingAdvanceUsdCents)}
              </td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatUsd(totals.reimbursementUsdCents)}
              </td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatUsd(totals.appraisalAdvanceUsdCents)}
              </td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatUsd(totals.offboardingDeductionUsdCents)}
              </td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatUsd(totals.effectiveDollarInwardUsdCents)}
              </td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatUsd(totals.monthlyDollarPaidUsdCents)}
              </td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatUsd(totals.totalBalanceUsdCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </form>
  );
}
