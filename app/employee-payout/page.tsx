import { Shell } from "../_components/shell";
import { GlassPanel } from "../_components/glass-panel";
import { inputClass } from "../_components/field";
import {
  markEmployeePayoutPaidAction,
  updateEmployeePayoutAction,
} from "@/src/features/billing/actions";
import { listInvoices, getEmployeePayoutInvoice } from "@/src/features/billing/store";
import { formatInr, formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function EmployeePayoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    invoiceId?: string | string[];
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const allInvoices = await listInvoices();
  const cashedOutInvoices = allInvoices.filter((invoice) => invoice.status === "cashed_out");

  const selectedInvoiceIdRaw = Array.isArray(resolvedSearchParams.invoiceId)
    ? resolvedSearchParams.invoiceId[0]
    : resolvedSearchParams.invoiceId;
  const selectedInvoiceId =
    selectedInvoiceIdRaw || cashedOutInvoices[0]?.id || "";

  const selectedPayoutData = selectedInvoiceId
    ? await getEmployeePayoutInvoice(selectedInvoiceId)
    : undefined;
  const flashStatus = Array.isArray(resolvedSearchParams.flashStatus)
    ? resolvedSearchParams.flashStatus[0]
    : resolvedSearchParams.flashStatus;
  const flashMessage = Array.isArray(resolvedSearchParams.flashMessage)
    ? resolvedSearchParams.flashMessage[0]
    : resolvedSearchParams.flashMessage;
  const returnTo = selectedInvoiceId
    ? `/employee-payout?invoiceId=${encodeURIComponent(selectedInvoiceId)}`
    : "/employee-payout";

  return (
    <Shell title="Employee Payout" eyebrow="Post-cashout employee settlement">
      <GlassPanel gradient>
        <div className="flex flex-wrap items-end gap-3">
          <form action="/employee-payout" className="flex flex-wrap items-end gap-3">
            <label className="block min-w-80">
              <span
                className="mb-2 block text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Select cashed-out invoice
              </span>
              <select
                name="invoiceId"
                defaultValue={selectedInvoiceId}
                className={inputClass}
                style={{
                  border: "1px solid var(--glass-border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-primary)",
                }}
              >
                {cashedOutInvoices.length === 0 ? (
                  <option value="">No cashed-out invoices available</option>
                ) : (
                  cashedOutInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} - {formatMonthYear(invoice.month, invoice.year)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <button type="submit" className="btn-outline">
              Load invoice employees
            </button>
          </form>
        </div>

        {flashMessage ? (
          <div
            className="mt-4 rounded-2xl px-4 py-3 text-sm font-medium"
            style={{
              background:
                flashStatus === "error"
                  ? "rgba(248, 113, 113, 0.08)"
                  : "rgba(16, 185, 129, 0.08)",
              border:
                flashStatus === "error"
                  ? "1px solid rgba(248, 113, 113, 0.25)"
                  : "1px solid rgba(16, 185, 129, 0.25)",
              color: flashStatus === "error" ? "#fca5a5" : "#6ee7b7",
            }}
          >
            {flashMessage}
          </div>
        ) : null}

        {selectedPayoutData ? (
          <div className="mt-6 overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
            <table className="glass-table">
              <thead>
                <tr>
                  {[
                    "Employee name",
                    "Dollars inward",
                    "Employee monthly dollars",
                    "Cashout USD/INR rate",
                    "Paid USD/INR rate",
                    "FX commission earning (INR)",
                    "Total commission (USD)",
                    "Commission earned (INR)",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedPayoutData.rows.map((row) => {
                  const formId = `employee-payout-${row.id}`;
                  return (
                    <tr key={row.id}>
                      <td className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {row.employeeNameSnapshot}
                      </td>
                      <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                        {formatUsd(row.dollarInwardUsdCents)}
                      </td>
                      <td>
                        <form id={formId} action={updateEmployeePayoutAction}></form>
                        <input type="hidden" form={formId} name="payoutId" value={row.id} />
                        <input type="hidden" form={formId} name="returnTo" value={returnTo} />
                        <input
                          form={formId}
                          type="number"
                          name="employeeMonthlyUsd"
                          step="0.01"
                          min="0.01"
                          defaultValue={(row.employeeMonthlyUsdCents / 100).toFixed(2)}
                          className={inputClass}
                          style={{
                            minWidth: "8rem",
                            border: "1px solid var(--glass-border)",
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </td>
                      <td>{row.cashoutUsdInrRate.toFixed(4)}</td>
                      <td>
                        <input
                          form={formId}
                          type="number"
                          name="paidUsdInrRate"
                          step="0.0001"
                          min="0.0001"
                          defaultValue={row.paidUsdInrRate?.toFixed(4)}
                          placeholder="Enter paid rate"
                          className={inputClass}
                          style={{
                            minWidth: "8rem",
                            border: "1px solid var(--glass-border)",
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </td>
                      <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                        {row.fxCommissionInrCents === undefined
                          ? "-"
                          : formatInr(row.fxCommissionInrCents)}
                      </td>
                      <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                        {formatUsd(row.totalCommissionUsdCents)}
                      </td>
                      <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                        {row.commissionEarnedInrCents === undefined
                          ? "-"
                          : formatInr(row.commissionEarnedInrCents)}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button type="submit" form={formId} className="btn-outline">
                            Update
                          </button>
                          <form action={markEmployeePayoutPaidAction}>
                            <input type="hidden" name="payoutId" value={row.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <input type="hidden" name="paidAt" value={todayIso()} />
                            <button type="submit" className="gradient-btn" disabled={row.isPaid}>
                              {row.isPaid ? "Paid" : "Mark paid"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {selectedPayoutData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center" style={{ color: "var(--text-muted)" }}>
                      No employees found for selected invoice.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Select a cashed-out invoice to load employee payout rows.
          </p>
        )}
      </GlassPanel>
    </Shell>
  );
}
