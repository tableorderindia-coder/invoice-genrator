import Link from "next/link";

import { ConfirmDeleteInvoiceButton } from "./confirm-delete-invoice-button";
import { Shell } from "../_components/shell";
import { GlassPanel } from "../_components/glass-panel";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import {
  deleteInvoiceAction,
  updateInvoiceStatusAction,
} from "@/src/features/billing/actions";
import { listCompanies, listInvoices } from "@/src/features/billing/store";
import { formatDate, formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

function getStatusClass(status: string) {
  return `status-badge status-${status.replace("_", "-")}`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const [invoices, companies] = await Promise.all([listInvoices(), listCompanies()]);
  const companyMap = new Map(companies.map((company) => [company.id, company.name]));
  const flashStatus = Array.isArray(resolvedSearchParams.flashStatus)
    ? resolvedSearchParams.flashStatus[0]
    : resolvedSearchParams.flashStatus;
  const flashMessage = Array.isArray(resolvedSearchParams.flashMessage)
    ? resolvedSearchParams.flashMessage[0]
    : resolvedSearchParams.flashMessage;

  return (
    <Shell title="Invoices" eyebrow="Issued invoices">
      <GlassPanel gradient>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Invoice register
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              All invoices live here for daily operations.
            </p>
          </div>
          <Link href="/invoices/create" className="btn-outline">
            Go to create invoice
          </Link>
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

        <div className="mt-6 overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
          <table className="glass-table">
            <thead>
              <tr>
                {["Invoice", "Company", "Period", "Billing date", "Status", "Total", "Actions"].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {invoice.invoiceNumber}
                  </td>
                  <td>{companyMap.get(invoice.companyId)}</td>
                  <td>{formatMonthYear(invoice.month, invoice.year)}</td>
                  <td>{formatDate(invoice.billingDate)}</td>
                  <td>
                    <span className={getStatusClass(invoice.status)}>
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: "currentColor" }}
                      />
                      {invoice.status.replace("_", " ")}
                    </span>
                  </td>
                  <td
                    className="font-semibold"
                    style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
                  >
                    {formatUsd(invoice.grandTotalUsdCents)}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/api/invoices/${invoice.id}/pdf`}
                        className="btn-outline"
                      >
                        Open PDF
                      </Link>
                      <Link href={`/invoices/${invoice.id}`} className="btn-outline">
                        Open editor
                      </Link>
                      <form action={deleteInvoiceAction}>
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <input type="hidden" name="returnTo" value="/invoices" />
                        <ConfirmDeleteInvoiceButton
                          className="btn-outline"
                          message={`Delete invoice ${invoice.invoiceNumber}? This permanently removes all linked invoice data.`}
                        />
                      </form>
                      {invoice.status === "generated" ? (
                        <form action={updateInvoiceStatusAction}>
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <input type="hidden" name="status" value="sent" />
                          <PendingSubmitButton
                            className="gradient-btn"
                            defaultText="Mark sent"
                            pendingText="Marking sent..."
                          />
                        </form>
                      ) : invoice.status === "sent" ? (
                        <span
                          className="rounded-full px-3 py-2 text-xs font-semibold"
                          style={{
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-muted)",
                          }}
                        >
                          Sent
                        </span>
                      ) : invoice.status === "cashed_out" ? (
                        <span
                          className="rounded-full px-3 py-2 text-xs font-semibold"
                          style={{
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-muted)",
                          }}
                        >
                          Cashed out
                        </span>
                      ) : (
                        <span
                          className="rounded-full px-3 py-2 text-xs font-semibold"
                          style={{
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-muted)",
                          }}
                        >
                          Draft
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </Shell>
  );
}
