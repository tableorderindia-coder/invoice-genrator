import Link from "next/link";

import { Shell } from "../_components/shell";
import { GlassPanel } from "../_components/glass-panel";
import { updateInvoiceStatusAction } from "@/src/features/billing/actions";
import { filterIssuedInvoices } from "@/src/features/billing/invoice-workflow";
import { listCompanies, listInvoices } from "@/src/features/billing/store";
import { formatDate, formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

function getStatusClass(status: string) {
  return `status-badge status-${status.replace("_", "-")}`;
}

export default async function InvoicesPage() {
  const [allInvoices, companies] = await Promise.all([listInvoices(), listCompanies()]);
  const invoices = filterIssuedInvoices(allInvoices);
  const companyMap = new Map(companies.map((company) => [company.id, company.name]));

  return (
    <Shell title="Invoices" eyebrow="Issued invoices">
      <GlassPanel gradient>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Invoice register
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Generated and sent invoices live here for daily operations.
            </p>
          </div>
          <Link href="/invoices/create" className="btn-outline">
            Go to create invoice
          </Link>
        </div>

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
                      {invoice.status === "generated" ? (
                        <form action={updateInvoiceStatusAction}>
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <input type="hidden" name="status" value="sent" />
                          <button type="submit" className="gradient-btn">
                            Mark sent
                          </button>
                        </form>
                      ) : (
                        <span
                          className="rounded-full px-3 py-2 text-xs font-semibold"
                          style={{
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-muted)",
                          }}
                        >
                          Sent
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    No generated or sent invoices yet.
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
