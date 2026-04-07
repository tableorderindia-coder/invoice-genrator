import Link from "next/link";

import { Shell } from "../_components/shell";
import { GlassPanel } from "../_components/glass-panel";
import { listCompanies, listInvoices } from "@/src/features/billing/store";
import { formatDate, formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

function getStatusClass(status: string) {
  return `status-badge status-${status.replace("_", "-")}`;
}

export default async function InvoicesPage() {
  const invoices = await listInvoices();
  const companies = await listCompanies();
  const companyMap = new Map(companies.map((company) => [company.id, company.name]));

  return (
    <Shell title="Invoices" eyebrow="Snapshot history">
      <GlassPanel gradient>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Invoice register
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Every invoice is a frozen monthly snapshot.
            </p>
          </div>
          <Link href="/invoices/new" className="gradient-btn flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create invoice
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
          <table className="glass-table">
            <thead>
              <tr>
                {["Invoice", "Company", "Period", "Billing date", "Status", "Total"].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="font-semibold">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="hover:underline underline-offset-4"
                      style={{ color: "var(--text-accent)" }}
                    >
                      {invoice.invoiceNumber}
                    </Link>
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
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    No invoices created yet.
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
