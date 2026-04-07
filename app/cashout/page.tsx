import Link from "next/link";

import { Shell } from "../_components/shell";
import { GlassPanel } from "../_components/glass-panel";
import { cashOutInvoiceAction } from "@/src/features/billing/actions";
import { filterCashoutEligibleInvoices } from "@/src/features/billing/invoice-workflow";
import { listCompanies, listInvoices } from "@/src/features/billing/store";
import { formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function CashoutPage() {
  const [allInvoices, companies] = await Promise.all([listInvoices(), listCompanies()]);
  const invoices = filterCashoutEligibleInvoices(allInvoices);
  const companyMap = new Map(companies.map((company) => [company.id, company.name]));

  return (
    <Shell title="Cashout" eyebrow="Settlement queue">
      <GlassPanel gradient>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Ready for cashout
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Mark generated or sent invoices as cashed out from this separate workflow.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
          <table className="glass-table">
            <thead>
              <tr>
                {["Invoice", "Company", "Period", "Status", "Total", "Cashout"].map((heading) => (
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
                  <td>
                    <span className={`status-badge status-${invoice.status}`}>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/api/invoices/${invoice.id}/pdf`} className="btn-outline">
                        Open PDF
                      </Link>
                      <form action={cashOutInvoiceAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <input
                          type="date"
                          name="realizedAt"
                          defaultValue={todayIso()}
                          max={todayIso()}
                          className="min-w-36"
                          style={{
                            height: "44px",
                            borderRadius: "14px",
                            padding: "0 14px",
                            border: "1px solid var(--glass-border)",
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <button type="submit" className="gradient-btn">
                          Mark cashout
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    No invoices are waiting for cashout.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          Cashout records the settlement date and moves the invoice out of the active operations queue.
        </p>
      </GlassPanel>
    </Shell>
  );
}
