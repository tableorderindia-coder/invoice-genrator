import Link from "next/link";

import { Shell } from "../_components/shell";
import { GlassPanel } from "../_components/glass-panel";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { cashOutInvoiceAction } from "@/src/features/billing/actions";
import { filterCashoutEligibleInvoices } from "@/src/features/billing/invoice-workflow";
import { listCompanies, listInvoices } from "@/src/features/billing/store";
import { formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function CashoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const [allInvoices, companies] = await Promise.all([listInvoices(), listCompanies()]);
  const invoices = filterCashoutEligibleInvoices(allInvoices);
  const companyMap = new Map(companies.map((company) => [company.id, company.name]));
  const resolvedSearchParams = await searchParams;
  const flashStatus = Array.isArray(resolvedSearchParams.flashStatus)
    ? resolvedSearchParams.flashStatus[0]
    : resolvedSearchParams.flashStatus;
  const flashMessage = Array.isArray(resolvedSearchParams.flashMessage)
    ? resolvedSearchParams.flashMessage[0]
    : resolvedSearchParams.flashMessage;

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
                {[
                  "Invoice",
                  "Company",
                  "Period",
                  "Status",
                  "Invoice total",
                  "Cashout settlement",
                ].map((heading) => (
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
                      <form
                        action={cashOutInvoiceAction}
                        className="grid gap-2 md:grid-cols-4 md:items-center"
                      >
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <input type="hidden" name="returnTo" value="/cashout" />
                        <input
                          type="date"
                          name="realizedAt"
                          aria-label="Cashout date"
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
                        <input
                          type="number"
                          name="dollarInboundUsd"
                          aria-label="Dollar inbound (USD)"
                          placeholder="Dollar inbound (USD)"
                          min="0.01"
                          step="0.01"
                          className="min-w-40"
                          style={{
                            height: "44px",
                            borderRadius: "14px",
                            padding: "0 14px",
                            border: "1px solid var(--glass-border)",
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <input
                          type="number"
                          name="usdInrRate"
                          aria-label="USD/INR rate"
                          placeholder="USD/INR rate"
                          min="0.0001"
                          step="0.0001"
                          className="min-w-32"
                          style={{
                            height: "44px",
                            borderRadius: "14px",
                            padding: "0 14px",
                            border: "1px solid var(--glass-border)",
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <PendingSubmitButton
                          className="gradient-btn"
                          defaultText="Mark cashout"
                          pendingText="Saving cashout..."
                        />
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
          Cashout records settlement date, actual dollar inbound, and received USD/INR rate.
        </p>
      </GlassPanel>
    </Shell>
  );
}
